import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiResponse, clearApiMocks, mockApi } from '../helpers/api'

const member = {
  email: 'camille.martin@example.test',
  first_name: 'Camille',
  last_name: 'Martin',
  position: 'Trésorier·e',
  is_superuser: false,
}
const credentials = { email: 'camille.martin@example.test', password: 'un mot de passe de test' }

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
    useSessionStore().clear()
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

  it('forgets the member along with an ended session', async () => {
    /**
     * Given a member shown in the board's sidebar
     * When the server refuses to renew their session
     * Then neither the access token nor the member is kept
     */
    mockRefresh(() => apiResponse(401, { detail: 'Authentification requise.' }))
    const session = useSessionStore()
    session.member = member

    expect(await session.renew()).toBe('ended')
    expect(session.member).toBeNull()
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

  describe('signIn', () => {
    beforeEach(() => {
      useSessionStore().clear()
    })

    it('opens a session with the credentials the member typed', async () => {
      /**
       * Given credentials the server accepts
       * When the member signs in
       * Then the server receives them, and the access token is kept in memory
       */
      mockApi('/api/auth/login', { method: 'POST', handler: () => apiResponse(200, { access: 'access-2' }) })
      const fetch = globalThis.fetch
      const sent: unknown[] = []
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        if (input instanceof Request) sent.push(await input.clone().json())
        return fetch(input, init)
      })
      const session = useSessionStore()

      expect(await session.signIn(credentials)).toBeNull()
      expect(session.accessToken).toBe('access-2')
      expect(sent).toEqual([credentials])
    })

    it.each([
      [401, 'Identifiants invalides.'],
      [403, 'Accès réservé aux membres du bureau.'],
      [429, 'Trop de requêtes. Réessayez dans quelques instants.'],
    ])('shows the reason of a %i on the form', async (status, detail) => {
      /**
       * Given a sign-in the server refuses
       * Then its reason lands on the form, and no session opens
       */
      mockApi('/api/auth/login', { method: 'POST', handler: () => apiResponse(status, { detail }) })
      const session = useSessionStore()

      expect(await session.signIn(credentials)).toEqual({ form: [detail], fields: {} })
      expect(session.accessToken).toBeNull()
    })

    it('lays a 422 on the fields', async () => {
      mockApi('/api/auth/login', {
        method: 'POST',
        handler: () => apiResponse(422, {
          detail: [{ type: 'missing', loc: ['body', 'payload', 'password'], msg: 'Ce champ est obligatoire.' }],
        }),
      })

      expect(await useSessionStore().signIn(credentials)).toEqual({
        form: [],
        fields: { password: ['Ce champ est obligatoire.'] },
      })
    })

    it('points at the connection when the network fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

      expect(await useSessionStore().signIn(credentials)).toEqual({
        form: ['Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.'],
        fields: {},
      })
    })
  })

  describe('signOut', () => {
    it('closes the session on the server, then forgets it', async () => {
      /**
       * Given a signed-in member
       * When they sign out
       * Then the server closes the session, and nothing of it stays in memory
       */
      const logout = vi.fn(() => new Response(null, { status: 204 }))
      mockApi('/api/auth/logout', { method: 'POST', handler: logout })
      const session = useSessionStore()
      session.member = member

      expect(await session.signOut()).toBeNull()
      expect(logout).toHaveBeenCalledOnce()
      expect(session.accessToken).toBeNull()
      expect(session.member).toBeNull()
    })

    it('keeps the session the server could not close', async () => {
      /**
       * Given a server that cannot answer for the time being
       * When the member signs out
       * Then they are told so, and stay signed in: the refresh cookie would
       * otherwise still sign this browser in
       */
      mockApi('/api/auth/logout', { method: 'POST', handler: () => apiResponse(503, { detail: 'Service indisponible.' }) })
      const session = useSessionStore()

      expect(await session.signOut()).toBe('Le service est momentanément indisponible. Réessayez dans quelques instants.')
      expect(session.accessToken).toBe('access-1')
    })

    it('keeps the session when the network fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const session = useSessionStore()

      expect(await session.signOut()).toBe('Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.')
      expect(session.accessToken).toBe('access-1')
    })
  })

  describe('loadMember', () => {
    it('learns who the signed-in member is', async () => {
      mockApi('/api/auth/me', { method: 'GET', handler: () => apiResponse(200, member) })
      const session = useSessionStore()

      await session.loadMember()

      expect(session.member).toEqual(member)
    })

    it('leaves the member unknown when the network fails', async () => {
      /**
       * Given a network failure
       * When the member's identity is asked for
       * Then it stays unknown, without any error for the page to handle
       */
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const session = useSessionStore()

      await expect(session.loadMember()).resolves.toBeUndefined()
      expect(session.member).toBeNull()
    })
  })
})
