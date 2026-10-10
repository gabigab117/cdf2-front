import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SetPasswordPage from '~/pages/set-password.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../helpers/api'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const INVALID_LINK = 'Ce lien n’est plus valable. Demandez-en un nouveau à la personne qui gère les comptes du bureau.'

function mountPage(hash = '#MTI.d2abcd-0123') {
  return mountSuspended(SetPasswordPage, { route: `/choisir-mot-de-passe${hash}` })
}

describe('the page to choose a password', () => {
  afterEach(async () => {
    clearApiMocks()
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('names the account of the link, records the password, then leads to the sign-in', async () => {
    /**
     * Given the link of Julie's invitation
     * When she opens it, then types her password twice
     * Then the page names her account, records her password, and leads her to
     * the sign-in, her address and the reason in the state of the navigation
     */
    mockApi('/api/auth/password-link', { handler: () => apiResponse(200, { email: 'julie.petit@example.fr' }) })
    mockApi('/api/auth/password', { handler: () => apiResponse(200, { email: 'julie.petit@example.fr' }) })
    const sent = recordRequests()
    const view = await mountPage()

    await vi.waitFor(() => expect(view.text()).toContain('Pour le compte julie.petit@example.fr'))
    const [password, confirmation] = view.findAll('input[type="password"]')
    await password!.setValue('Une-fanfare-sous-les-tilleuls')
    await confirmation!.setValue('Une-fanfare-sous-les-tilleuls')
    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalled())
    expect(sent.map(request => [request.url, request.body])).toEqual([
      ['/api/auth/password-link', { uid: 'MTI', token: 'd2abcd-0123' }],
      ['/api/auth/password', { uid: 'MTI', token: 'd2abcd-0123', password: 'Une-fanfare-sous-les-tilleuls', confirmation: 'Une-fanfare-sous-les-tilleuls' }],
    ])
    expect(navigateToMock).toHaveBeenCalledWith(
      { path: '/connexion', state: { email: 'julie.petit@example.fr', notice: 'Mot de passe enregistré. Vous pouvez vous connecter.' } },
      { replace: true },
    )
  })

  it('places what Django refuses under its field, and empties both', async () => {
    mockApi('/api/auth/password-link', { handler: () => apiResponse(200, { email: 'julie.petit@example.fr' }) })
    mockApi('/api/auth/password', {
      handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body', 'password'], msg: 'Ce mot de passe est trop courant.' },
        { type: 'validation_error', loc: ['body', 'confirmation'], msg: 'Les deux mots de passe ne correspondent pas.' },
      ] }),
    })
    const view = await mountPage()
    await vi.waitFor(() => expect(view.find('form').exists()).toBe(true))

    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(view.text()).toContain('Ce mot de passe est trop courant.'))
    expect(view.text()).toContain('Les deux mots de passe ne correspondent pas.')
    expect(view.findAll('input[type="password"]').map(input => (input.element as HTMLInputElement).value)).toEqual(['', ''])
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('says a link holds no more, and asks nothing', async () => {
    mockApi('/api/auth/password-link', {
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body'], msg: INVALID_LINK }] }),
    })

    const view = await mountPage()

    await vi.waitFor(() => expect(view.find('[role="alert"]').exists()).toBe(true))
    expect(view.get('[role="alert"]').text()).toBe(INVALID_LINK)
    expect(view.find('form').exists()).toBe(false)
  })

  it('says so of an address without its link, without asking the API', async () => {
    const sent = recordRequests()

    const view = await mountPage('')

    expect(view.get('[role="alert"]').text()).toBe(INVALID_LINK)
    expect(sent).toEqual([])
  })

  it('is rendered by the browser alone, and kept out of the search engines', async () => {
    expect(getRouteRules({ path: '/choisir-mot-de-passe' }).ssr).toBe(false)
    mockApi('/api/auth/password-link', { handler: () => apiResponse(200, { email: 'julie.petit@example.fr' }) })

    await mountPage()

    await vi.waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    })
  })
})
