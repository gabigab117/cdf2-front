import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiResponse, clearApiMocks, mockApi } from '../helpers/api'

function mockRefresh(answer: () => Response): ReturnType<typeof vi.fn> {
  const refresh = vi.fn(answer)
  mockApi('/api/auth/refresh', { method: 'POST', handler: refresh })
  return refresh
}

describe('session store', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('keeps the access token of a renewed session', async () => {
    /**
     * Given a refresh cookie the server accepts
     * When the session is renewed
     * Then the new access token is kept in memory
     */
    mockRefresh(() => apiResponse(200, { access: 'access-2' }))
    const session = useSessionStore()

    expect(await session.renew()).toBe('renewed')
    expect(session.accessToken).toBe('access-2')
  })

  it('never writes the access token into the browser\'s storage', async () => {
    /**
     * Given a renewed session
     * Then neither the local storage nor the session storage holds anything
     */
    mockRefresh(() => apiResponse(200, { access: 'access-2' }))

    await useSessionStore().renew()

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('shares a single renewal between concurrent calls', async () => {
    /**
     * Given two renewals asked for at the same time
     * Then the server is asked once, and both get its outcome
     */
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-2' }))
    const session = useSessionStore()

    const outcomes = await Promise.all([session.renew(), session.renew()])

    expect(outcomes).toEqual(['renewed', 'renewed'])
    expect(refresh).toHaveBeenCalledOnce()
  })

  it.each([401, 403])('ends the session when the server refuses it with a %i', async (status) => {
    /**
     * Given a session the server refuses to renew
     * When the session is renewed
     * Then it has ended, and the access token is forgotten
     */
    mockRefresh(() => apiResponse(status, { detail: 'Refusé.' }))
    const session = useSessionStore()

    expect(await session.renew()).toBe('ended')
    expect(session.accessToken).toBeNull()
  })

  it('keeps the session when the server fails for a while', async () => {
    /**
     * Given a server that cannot answer for the time being
     * When the session is renewed
     * Then the renewal fails without ending the session
     */
    mockRefresh(() => apiResponse(503, { detail: 'Service indisponible.' }))
    const session = useSessionStore()

    const renewal = session.renew()

    await expect(renewal).rejects.toBeInstanceOf(SessionRenewalError)
    await expect(renewal).rejects.toMatchObject({ status: 503, retryAfter: null })
    expect(session.accessToken).toBe('access-1')
  })

  it('renews under a lock the tabs share', async () => {
    /**
     * Given a browser that coordinates its tabs with the Web Locks API
     * When the session is renewed
     * Then the renewal runs under the lock shared by the tabs
     */
    mockRefresh(() => apiResponse(200, { access: 'access-2' }))
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => task())
    vi.spyOn(navigator, 'locks', 'get').mockReturnValue({ request } as unknown as LockManager)

    expect(await useSessionStore().renew()).toBe('renewed')
    expect(request).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledWith('session-renewal', expect.any(Function))
  })
})
