import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiResponse, clearApiMocks, mockApi } from '../helpers/api'

function mockRefresh(answer: () => Response): ReturnType<typeof vi.fn> {
  const refresh = vi.fn(answer)
  mockApi('/api/auth/refresh', { method: 'POST', handler: refresh })
  return refresh
}

const sessionEnded = () => apiResponse(401, { detail: 'Authentification requise.' })

/** Navigates as a click would, and tells where the browser ends up. */
async function visit(path: string): Promise<string> {
  const router = useRouter()
  // A navigation the guard rejects with an error shows the error page instead.
  await router.push(path).catch(() => undefined)
  return router.currentRoute.value.fullPath
}

describe('auth middleware', () => {
  afterEach(async () => {
    clearApiMocks()
    vi.restoreAllMocks()
    useSessionStore().clear()
    await clearError()
    await useRouter().push('/')
  })

  it('opens a public page without any call', async () => {
    /**
     * Given an anonymous visitor
     * When they open the home page
     * Then it opens, without anything asked of the server
     */
    const session = useSessionStore()
    session.accessToken = 'access-1'
    await visit('/bureau/documents')
    session.clear()
    const refresh = mockRefresh(sessionEnded)

    expect(await visit('/')).toBe('/')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('leaves an unknown address to the 404 page', async () => {
    /**
     * Given an address that matches no page, even under /bureau
     * When it is opened
     * Then the 404 page answers it, rather than the sign-in page
     */
    const refresh = mockRefresh(sessionEnded)

    await visit('/bureau/inconnue')

    expect(useError().value).toMatchObject({ status: 404 })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('opens a private page to the session in memory', async () => {
    useSessionStore().accessToken = 'access-1'
    const refresh = mockRefresh(sessionEnded)

    expect(await visit('/bureau/stock')).toBe('/bureau/stock')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('restores the session after a reload', async () => {
    /**
     * Given a refresh cookie still valid, and no access token in memory
     * When a private page is opened
     * Then the session is renewed once, and the page opens
     */
    const refresh = mockRefresh(() => apiResponse(200, { access: 'access-2' }))

    expect(await visit('/bureau/stock')).toBe('/bureau/stock')
    expect(refresh).toHaveBeenCalledOnce()
    expect(useSessionStore().accessToken).toBe('access-2')
  })

  it('sends a member whose session has ended to sign in, then back', async () => {
    /**
     * Given a session the server no longer renews
     * When a private page is opened
     * Then the sign-in page opens, knowing the page to come back to
     */
    mockRefresh(sessionEnded)

    await visit('/bureau/stock?vue=bas&tri=nom')

    const route = useRouter().currentRoute.value
    expect(route.path).toBe('/connexion')
    expect(route.query.redirect).toBe('/bureau/stock?vue=bas&tri=nom')
  })

  it('shows an error, not the sign-in page, when the session cannot be checked', async () => {
    /**
     * Given a server that cannot renew sessions for the time being
     * When a private page is opened
     * Then the error page offers to try that page again
     * And the member is not asked to sign in, as their session may be valid
     */
    mockRefresh(() => apiResponse(503, { detail: 'Service indisponible.' }))

    expect(await visit('/bureau/stock')).not.toContain('/connexion')
    expect(useError().value).toMatchObject({ status: 503, data: { path: '/bureau/stock' } })
  })

  describe('on the sign-in page', () => {
    it('sends a member whose session is still open where they were going', async () => {
      /**
       * Given a member back on their bookmark of the sign-in page, whose refresh
       * cookie is still valid
       * When the page opens
       * Then they go straight to where they were going
       */
      mockRefresh(() => apiResponse(200, { access: 'access-2' }))

      expect(await visit('/connexion?redirect=/bureau/prets')).toBe('/bureau/prets')
    })

    it('never sends a member to another site', async () => {
      useSessionStore().accessToken = 'access-1'

      expect(await visit('/connexion?redirect=//other.example')).toBe('/bureau')
    })

    it('shows the form when no session can be restored', async () => {
      mockRefresh(sessionEnded)

      expect(await visit('/connexion')).toBe('/connexion')
    })

    it('shows the form when the session cannot be checked', async () => {
      mockRefresh(() => apiResponse(503, { detail: 'Service indisponible.' }))

      expect(await visit('/connexion')).toBe('/connexion')
      expect(useError().value).toBeFalsy()
    })
  })
})
