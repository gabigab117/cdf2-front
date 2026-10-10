import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '~/pages/login.vue'
import { apiResponse, clearApiMocks, mockApi } from '../helpers/api'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

async function signIn(password: string) {
  const page = await mountSuspended(LoginPage, { route: '/connexion?redirect=/bureau/stock' })
  await page.get('input[type="email"]').setValue('camille.martin@example.test')
  await page.get('input[type="password"]').setValue(password)
  await page.get('form').trigger('submit')
  return page
}

describe('sign-in page', () => {
  beforeEach(() => {
    // No session to restore: the page shows its form.
    mockApi('/api/auth/refresh', { method: 'POST', handler: () => apiResponse(401, { detail: 'Authentification requise.' }) })
  })

  afterEach(() => {
    clearApiMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
  })

  it('opens the page the member was going to', async () => {
    /**
     * Given a member sent to sign in on their way to the Stock screen
     * When they sign in
     * Then the Stock screen opens, in place of the sign-in page
     */
    mockApi('/api/auth/login', { method: 'POST', handler: () => apiResponse(200, { access: 'access-1' }) })

    await signIn('le bon mot de passe')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalled())

    expect(navigateToMock).toHaveBeenCalledWith('/bureau/stock', { replace: true })
    expect(useSessionStore().accessToken).toBe('access-1')
  })

  it('shows why the server refused, and clears the password', async () => {
    /**
     * Given credentials the server refuses
     * When the member signs in
     * Then they read the server's reason, and type their password again
     */
    mockApi('/api/auth/login', { method: 'POST', handler: () => apiResponse(401, { detail: 'Identifiants invalides.' }) })

    const page = await signIn('un mauvais mot de passe')
    await vi.waitFor(() => expect(page.find('[role="alert"]').exists()).toBe(true))

    expect(page.get('[role="alert"]').text()).toBe('Identifiants invalides.')
    expect((page.get('input[type="password"]').element as HTMLInputElement).value).toBe('')
    expect((page.get('input[type="email"]').element as HTMLInputElement).value).toBe('camille.martin@example.test')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('fills in the address of a member who just chose their password, and says why', async () => {
    /**
     * Given Julie, who just chose her password
     * When the sign-in page opens, her address and the reason in the state of
     * the navigation
     * Then her address is filled in, and the page says her password is recorded
     */
    window.history.replaceState({ ...window.history.state, email: 'julie.petit@example.fr', notice: 'Mot de passe enregistré. Vous pouvez vous connecter.' }, '')

    const page = await mountSuspended(LoginPage, { route: '/connexion' })

    expect((page.get('input[type="email"]').element as HTMLInputElement).value).toBe('julie.petit@example.fr')
    expect(page.get('[role="status"]').text()).toBe('Mot de passe enregistré. Vous pouvez vous connecter.')
    const { email: _email, notice: _notice, ...state } = window.history.state
    window.history.replaceState(state, '')
  })
})
