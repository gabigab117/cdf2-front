import createClient, { type Middleware } from 'openapi-fetch'
import type { NuxtApp } from '#app'
import type { ApiClient } from '~/composables/useApi'
import type { paths } from '~/types/api'

/** Where a board member whose session has ended signs in again. */
const SIGN_IN_PATH = '/connexion'

// The operations that open, renew and close a session answer 401 for wrong
// credentials or a spent session: renewing the session and replaying them would
// make no sense, and the renewal would end up waiting for its own answer.
const SESSION_PATHS: ReadonlySet<string> = new Set<keyof paths>([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
])

export default defineNuxtPlugin((nuxtApp) => {
  const api: ApiClient = createClient<paths>({
    // The refresh token travels in its cookie.
    credentials: 'include',
    // Looked up on each call, so that a fetch replaced after this plugin ran (as
    // the tests do to cut the network) is the one used.
    fetch: request => globalThis.fetch(request),
  })
  api.use(sessionMiddleware(nuxtApp))

  return { provide: { api } }
})

function bearer(token: string): string {
  return `Bearer ${token}`
}

/**
 * Sends the board member's access token, and replays once a request refused
 * because that token has expired, after renewing the session. Concurrent requests
 * wait for a single renewal.
 */
function sessionMiddleware(nuxtApp: NuxtApp): Middleware {
  // A request body can be read only once: a copy waits for the answer, in case
  // the request has to be sent again.
  const copies = new WeakMap<Request, Request>()

  return {
    onRequest({ request, schemaPath }) {
      const token = useSessionStore(nuxtApp.$pinia).accessToken
      if (token) request.headers.set('Authorization', bearer(token))
      if (!SESSION_PATHS.has(schemaPath)) copies.set(request, request.clone())
      return request
    },

    async onResponse({ request, response, options }) {
      const copy = copies.get(request)
      if (response.status !== 401 || !copy) return
      const session = useSessionStore(nuxtApp.$pinia)
      const sent = request.headers.get('Authorization')
      // Sent without a session, or refused once the session had ended: the
      // refusal stands. Restoring a session is the job of the board's route
      // guard, never a side effect of a request.
      if (!sent || !session.accessToken) return
      // Refused with the current token: it has expired. Otherwise, another
      // request renewed the session meanwhile, and its token serves at once.
      if (sent === bearer(session.accessToken) && await session.renew() === 'ended') {
        await signInAgain(nuxtApp)
        return
      }
      // Read again: the renewal has replaced it.
      const token = session.accessToken
      if (!token) return
      copy.headers.set('Authorization', bearer(token))
      // The browser's fetch refuses to run as a method of another object.
      const { fetch } = options
      return fetch(copy)
    },
  }
}

async function signInAgain(nuxtApp: NuxtApp): Promise<void> {
  const { path, fullPath } = nuxtApp.$router.currentRoute.value
  if (path === SIGN_IN_PATH) return
  await nuxtApp.runWithContext(() => navigateTo({ path: SIGN_IN_PATH, query: { redirect: fullPath } }))
}
