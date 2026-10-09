import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiResponse, clearApiMocks, mockApi } from '../helpers/api'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const member = {
  email: 'claire.martin@example.test',
  first_name: 'Claire',
  last_name: 'Martin',
  position: 'Secrétaire',
}
const unauthenticated = { detail: 'Authentification requise.' }

// The signed-in member's endpoint, which only knows the given access token.
function mockMe(validToken: string): ReturnType<typeof vi.fn> {
  const me = vi.fn((event: { headers: Headers }) =>
    event.headers.get('Authorization') === `Bearer ${validToken}`
      ? apiResponse(200, member)
      : apiResponse(401, unauthenticated),
  )
  mockApi('/api/auth/me', { method: 'GET', handler: me })
  return me
}

function mockRefresh(answer: () => Response): ReturnType<typeof vi.fn> {
  const refresh = vi.fn(answer)
  mockApi('/api/auth/refresh', { method: 'POST', handler: refresh })
  return refresh
}

describe('useApi', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    navigateToMock.mockReset()
    vi.restoreAllMocks()
  })

  it('sends the access token of the session', async () => {
    /**
     * Given a session in memory
     * When a private operation is called
     * Then its answer comes back
     */
    mockMe('access-1')

    const { data } = await useApi().GET('/api/auth/me')

    expect(data).toEqual(member)
  })

  it('renews an expired session, then replays the request with the new token', async () => {
    /**
     * Given an access token that has expired
     * When a private operation is refused with a 401
     * Then the session is renewed once
     * And the request is sent again with the new token
     */
    mockMe('access-2')
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-2' }))

    const { data } = await useApi().GET('/api/auth/me')

    expect(data).toEqual(member)
    expect(refresh).toHaveBeenCalledOnce()
    expect(useSessionStore().accessToken).toBe('access-2')
  })

  it('replays a request only once', async () => {
    /**
     * Given a session renewed after a 401
     * When the replayed request is refused again
     * Then that refusal is the answer
     */
    const me = mockMe('never-valid')
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-2' }))

    const { error, response } = await useApi().GET('/api/auth/me')

    expect(response.status).toBe(401)
    expect(error).toEqual(unauthenticated)
    expect(me).toHaveBeenCalledTimes(2)
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('sends the member back to sign in when the session has ended', async () => {
    /**
     * Given a session the server no longer renews
     * When a private operation is refused with a 401
     * Then the access token is forgotten
     * And the member is sent to the sign-in page, which brings them back here
     */
    mockMe('access-2')
    mockRefresh(() => apiResponse(401, unauthenticated))

    const { response } = await useApi().GET('/api/auth/me')

    expect(response.status).toBe(401)
    expect(useSessionStore().accessToken).toBeNull()
    expect(navigateToMock).toHaveBeenCalledOnce()
    expect(navigateToMock).toHaveBeenCalledWith({ path: '/connexion', query: { redirect: '/' } })
  })

  it('makes concurrent requests wait for a single renewal', async () => {
    /**
     * Given an access token that has expired
     * When three private operations are refused at the same time
     * Then the session is renewed once
     * And all three requests get their answer
     */
    mockMe('access-2')
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-2' }))
    const api = useApi()

    const answers = await Promise.all([api.GET('/api/auth/me'), api.GET('/api/auth/me'), api.GET('/api/auth/me')])

    expect(answers.map(({ data }) => data)).toEqual([member, member, member])
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('replays with the token another request has renewed meanwhile', async () => {
    /**
     * Given a request refused while another request renewed the session
     * When its 401 arrives
     * Then it is sent again with the new token, without renewing again
     */
    mockApi('/api/auth/me', {
      method: 'GET',
      handler: (event: { headers: Headers }) => {
        if (event.headers.get('Authorization') === 'Bearer access-2') return apiResponse(200, member)
        useSessionStore().accessToken = 'access-2'
        return apiResponse(401, unauthenticated)
      },
    })
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-3' }))

    const { data } = await useApi().GET('/api/auth/me')

    expect(data).toEqual(member)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('leaves a request sent without a session refused', async () => {
    /**
     * Given no session in memory
     * When a private operation is refused with a 401
     * Then nothing tries to renew a session
     */
    useSessionStore().accessToken = null
    mockMe('access-1')
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-2' }))

    const { response } = await useApi().GET('/api/auth/me')

    expect(response.status).toBe(401)
    expect(refresh).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('never renews the session for the operations that open or renew it', async () => {
    /**
     * Given a session in memory
     * When signing in or renewing is refused with a 401
     * Then the refusal is the answer, without any renewal
     */
    mockApi('/api/auth/login', {
      method: 'POST',
      handler: () => apiResponse(401, { detail: 'Identifiants invalides.' }),
    })
    const refresh = mockRefresh(() => apiResponse(401, unauthenticated))
    const api = useApi()

    const signIn = await api.POST('/api/auth/login', {
      body: { email: 'claire.martin@example.test', password: 'mauvais mot de passe' },
    })
    const renewal = await api.POST('/api/auth/refresh')

    expect(signIn.error).toEqual({ detail: 'Identifiants invalides.' })
    expect(renewal.response.status).toBe(401)
    expect(refresh).toHaveBeenCalledOnce()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('passes a 403 on, with the reason the server gave', async () => {
    /**
     * Given an account that no longer belongs to the board
     * When a private operation is refused with a 403
     * Then the refusal and its message reach the caller, without any renewal
     */
    mockApi('/api/auth/me', {
      method: 'GET',
      handler: () => apiResponse(403, { detail: 'Accès réservé aux membres du bureau.' }),
    })
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-2' }))

    const { error, response } = await useApi().GET('/api/auth/me')

    expect(response.status).toBe(403)
    expect(error).toEqual({ detail: 'Accès réservé aux membres du bureau.' })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('keeps the session when its renewal is throttled', async () => {
    /**
     * Given an access token that has expired
     * When renewing the session is throttled
     * Then the request fails with the delay to wait
     * And the member stays signed in
     */
    mockMe('access-2')
    mockRefresh(() =>
      apiResponse(429, { detail: 'Trop de requêtes. Réessayez dans quelques instants.' }, { 'Retry-After': '30' }),
    )

    const answer = useApi().GET('/api/auth/me')

    await expect(answer).rejects.toBeInstanceOf(SessionRenewalError)
    await expect(answer).rejects.toMatchObject({ status: 429, retryAfter: 30 })
    expect(useSessionStore().accessToken).toBe('access-1')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('lets a network failure through, the session untouched', async () => {
    /**
     * Given a session in memory
     * When the network fails during a request
     * Then the request fails with that error
     * And the member stays signed in
     */
    const failure = new TypeError('Failed to fetch')
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(failure)

    await expect(useApi().GET('/api/auth/me')).rejects.toBe(failure)
    expect(useSessionStore().accessToken).toBe('access-1')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('keeps the session when the network fails during its renewal', async () => {
    /**
     * Given an access token that has expired
     * When the network fails while the session is renewed
     * Then the request fails with that error
     * And the member stays signed in
     */
    mockMe('access-2')
    const failure = new TypeError('Failed to fetch')
    const fetch = globalThis.fetch
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
      input instanceof Request && new URL(input.url).pathname === '/api/auth/refresh'
        ? Promise.reject(failure)
        : fetch(input, init),
    )

    await expect(useApi().GET('/api/auth/me')).rejects.toBe(failure)
    expect(useSessionStore().accessToken).toBe('access-1')
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
