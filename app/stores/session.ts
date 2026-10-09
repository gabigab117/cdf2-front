import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

/** How a renewal ends: a new access token, or a session over for good. */
export type SessionRenewal = 'renewed' | 'ended'

/** What a member types to sign in. */
export type Credentials = components['schemas']['LoginIn']

/** The signed-in member, as the board's pages show them. */
export type Member = components['schemas']['MeOut']

// A renewal left hanging would hold the lock of every tab.
const RENEWAL_TIMEOUT_MS = 10_000

export const useSessionStore = defineStore('session', () => {
  // In memory only, never in the browser's storage, which any script of the page
  // could read. After a reload, a renewal brings it back.
  const accessToken = ref<string | null>(null)

  // For display only: what a member may do is the API's decision.
  const member = ref<Member | null>(null)

  let renewal: Promise<SessionRenewal> | null = null

  /**
   * Opens a session.
   *
   * @returns null once signed in, or the errors to show on the sign-in form.
   */
  async function signIn(credentials: Credentials): Promise<FormErrors | null> {
    try {
      const { data, error, response } = await useApi().POST('/api/auth/login', { body: credentials })
      if (data) {
        accessToken.value = data.access
        return null
      }
      return toFormErrors(error) ?? { form: [errorMessage(error, response)], fields: {} }
    }
    catch (failure) {
      return { form: [errorMessage(failure)], fields: {} }
    }
  }

  /**
   * Closes the session on the server, then forgets it.
   *
   * A session the server could not close stays open here too: its refresh
   * cookie would otherwise still sign this browser in.
   *
   * @returns null once signed out, or the message to show.
   */
  async function signOut(): Promise<string | null> {
    try {
      const { error, response } = await useApi().POST('/api/auth/logout')
      if (!response.ok) return errorMessage(error, response)
    }
    catch (failure) {
      return errorMessage(failure)
    }
    clear()
    return null
  }

  /**
   * Learns who the signed-in member is. Left unknown when the API cannot tell:
   * the board's pages work without it.
   */
  async function loadMember(): Promise<void> {
    try {
      const { data } = await useApi().GET('/api/auth/me')
      if (data) member.value = data
    }
    catch {
      // Network failure: the member stays unknown until the next page load.
    }
  }

  /** Forgets the session on this side only. */
  function clear(): void {
    accessToken.value = null
    member.value = null
  }

  /**
   * Renews the session with the refresh cookie.
   *
   * Resolves only on a final outcome: 'renewed', or 'ended' when the server
   * refuses the session (401, 403), the session being forgotten. A rejection is
   * temporary (renewal throttled, server error, network failure) and never ends
   * the session. Concurrent calls share a single renewal.
   */
  function renew(): Promise<SessionRenewal> {
    if (import.meta.server) {
      throw new Error('A session is renewed in the browser only, never during server-side rendering.')
    }
    renewal ??= oneTabAtATime(requestRenewal).finally(() => {
      renewal = null
    })
    return renewal
  }

  async function requestRenewal(): Promise<SessionRenewal> {
    const { data, response } = await useApi().POST('/api/auth/refresh', {
      signal: AbortSignal.timeout(RENEWAL_TIMEOUT_MS),
    })
    if (data) {
      accessToken.value = data.access
      return 'renewed'
    }
    if (response.status === 401 || response.status === 403) {
      clear()
      return 'ended'
    }
    throw new SessionRenewalError(response)
  }

  return { accessToken, member, signIn, signOut, loadMember, clear, renew }
})

// The tabs share the refresh cookie, and each renewal spends it: they renew one
// at a time, each sending the cookie the previous one received. The Web Locks API
// only exists in secure contexts (HTTPS, localhost); elsewhere, tabs are not
// coordinated.
async function oneTabAtATime(task: () => Promise<SessionRenewal>): Promise<SessionRenewal> {
  return navigator.locks ? navigator.locks.request('session-renewal', task) : task()
}
