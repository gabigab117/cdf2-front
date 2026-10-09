/** How a renewal ends: a new access token, or a session over for good. */
export type SessionRenewal = 'renewed' | 'ended'

// A renewal left hanging would hold the lock of every tab.
const RENEWAL_TIMEOUT_MS = 10_000

export const useSessionStore = defineStore('session', () => {
  // In memory only, never in the browser's storage, which any script of the page
  // could read. After a reload, a renewal brings it back.
  const accessToken = ref<string | null>(null)

  let renewal: Promise<SessionRenewal> | null = null

  /**
   * Renews the session with the refresh cookie.
   *
   * Resolves only on a final outcome: 'renewed', or 'ended' when the server
   * refuses the session (401, 403), the access token being forgotten. A rejection
   * is temporary (renewal throttled, server error, network failure) and never
   * ends the session. Concurrent calls share a single renewal.
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
      accessToken.value = null
      return 'ended'
    }
    throw new SessionRenewalError(response)
  }

  return { accessToken, renew }
})

// The tabs share the refresh cookie, and each renewal spends it: they renew one
// at a time, each sending the cookie the previous one received. The Web Locks API
// only exists in secure contexts (HTTPS, localhost); elsewhere, tabs are not
// coordinated.
async function oneTabAtATime(task: () => Promise<SessionRenewal>): Promise<SessionRenewal> {
  return navigator.locks ? navigator.locks.request('session-renewal', task) : task()
}
