import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { components } from '~/types/api'
import AccountsPage from '~/pages/board/accounts/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { page } from '../../helpers/events'

type AccountOut = components['schemas']['AccountOut']

const { showErrorMock } = vi.hoisted(() => ({ showErrorMock: vi.fn() }))
mockNuxtImport('showError', () => showErrorMock)

function account(changes: Partial<AccountOut> = {}): AccountOut {
  return {
    id: 7,
    email: 'julie.petit@example.fr',
    first_name: 'Julie',
    last_name: 'Petit',
    position: 'Secrétaire',
    state: 'pending',
    is_superuser: false,
    link_sent_at: '2026-10-01T08:00:00Z',
    ...changes,
  }
}

const ACCOUNTS = [
  account(),
  account({ id: 8, email: 'bruno@example.fr', first_name: 'Bruno', last_name: 'Leroy', position: '', state: 'active', link_sent_at: null }),
  account({ id: 9, email: 'chloe@example.fr', first_name: 'Chloé', last_name: 'Morel', position: 'Trésorier·e', state: 'inactive' }),
  account({ id: 10, email: 'anne@example.fr', first_name: 'Anne', last_name: 'Durand', link_sent_at: null }),
]

function readable(text: string): string {
  return text.replaceAll(' ', ' ').replaceAll(' ', ' ')
}

function mockAccounts(items = ACCOUNTS) {
  mockApi('/api/board/accounts', { method: 'GET', handler: () => apiResponse(200, page(items)) })
}

function mountPage() {
  return mountSuspended(AccountsPage, { route: '/bureau/membres', attachTo: document.body })
}

function button(view: Awaited<ReturnType<typeof mountPage>>, text: string, index = 0) {
  return view.findAll('button').filter(candidate => candidate.text() === text)[index]!
}

describe('the accounts page', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-10T10:00:00+02:00')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    showErrorMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('lists the accounts, where each stands, and offers a new link to those not deactivated', async () => {
    mockAccounts()

    const view = await mountPage()

    await vi.waitFor(() => expect(view.findAll('li')).toHaveLength(4))
    expect(view.findAll('li').map(row => readable(row.text()))).toEqual([
      'Julie PetitInvitation envoyée le 1er oct.Secrétaire · julie.petit@example.fr Envoyer un nouveau lien',
      'Bruno LeroyActifbruno@example.fr Envoyer un nouveau lien',
      'Chloé MorelDésactivéTrésorier·e · chloe@example.fr',
      'Anne DurandLien non envoyéSecrétaire · anne@example.fr Envoyer un nouveau lien',
    ])
  })

  it('invites a member, and says the email went out', async () => {
    /**
     * Given the superuser on the accounts page
     * When they invite Julie Petit, secretary
     * Then the invitation is sent, the page says so, and the list is read again
     */
    mockAccounts([])
    mockApi('/api/board/accounts', { method: 'POST', handler: () => apiResponse(201, { account: account(), sent: true }) })
    const sent = recordRequests()
    const view = await mountPage()

    await view.get('input[type="email"]').setValue('julie.petit@example.fr')
    const [firstName, lastName] = view.findAll('input:not([type="email"])')
    await firstName!.setValue('Julie')
    await lastName!.setValue('Petit')
    await view.get('select').setValue('secretary')
    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(view.find('[role="status"]').exists()).toBe(true))
    expect(view.get('[role="status"]').text()).toBe('Invitation envoyée à julie.petit@example.fr.')
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      email: 'julie.petit@example.fr', first_name: 'Julie', last_name: 'Petit', position: 'secretary',
    })
    expect(sent.filter(request => request.method === 'GET' && request.url.startsWith('/api/board/accounts'))).toHaveLength(2)
    expect((view.get('input[type="email"]').element as HTMLInputElement).value).toBe('')
  })

  it('sends no position for « Aucune fonction », and tells an email that did not go', async () => {
    mockAccounts([])
    mockApi('/api/board/accounts', { method: 'POST', handler: () => apiResponse(201, { account: account({ link_sent_at: null }), sent: false }) })
    const sent = recordRequests()
    const view = await mountPage()

    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(view.find('[role="status"]').exists()).toBe(true))
    expect(view.get('[role="status"]').text()).toBe('Le compte est créé, mais l’e-mail n’est pas parti. Envoyez un nouveau lien.')
    expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ position: null })
  })

  it('places a refusal under its field', async () => {
    mockAccounts([])
    mockApi('/api/board/accounts', {
      method: 'POST',
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body', 'email'], msg: 'Un compte existe déjà avec cette adresse.' }] }),
    })
    const view = await mountPage()

    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(view.text()).toContain('Un compte existe déjà avec cette adresse.'))
    expect(view.get('input[type="email"]').attributes('aria-invalid')).toBe('true')
    expect(view.find('[role="status"]').exists()).toBe(false)
  })

  it('sends a new link, and says so', async () => {
    mockAccounts()
    mockApi('/api/board/accounts/{account_id}/link', { handler: () => apiResponse(200, { account: account({ id: 8, email: 'bruno@example.fr', state: 'active' }), sent: true }) }, { account_id: 8 })
    const sent = recordRequests()
    const view = await mountPage()
    await vi.waitFor(() => expect(view.findAll('li')).toHaveLength(4))

    await button(view, 'Envoyer un nouveau lien', 1).trigger('click')

    await vi.waitFor(() => expect(view.find('[role="status"]').exists()).toBe(true))
    expect(view.get('[role="status"]').text()).toBe('Nouveau lien envoyé à bruno@example.fr.')
    expect(sent.some(request => request.method === 'POST' && request.url === '/api/board/accounts/8/link')).toBe(true)
  })

  it('tells a new link that did not go, or was refused', async () => {
    mockAccounts()
    mockApi('/api/board/accounts/{account_id}/link', { handler: () => apiResponse(200, { account: account(), sent: false }) }, { account_id: 7 })
    mockApi('/api/board/accounts/{account_id}/link', {
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body'], msg: 'Ce compte est désactivé : il ne reçoit plus de lien.' }] }),
    }, { account_id: 8 })
    const view = await mountPage()
    await vi.waitFor(() => expect(view.findAll('li')).toHaveLength(4))

    await button(view, 'Envoyer un nouveau lien').trigger('click')
    await vi.waitFor(() => expect(view.find('[role="status"]').exists()).toBe(true))
    expect(view.get('[role="status"]').text()).toBe('L’e-mail n’est pas parti à julie.petit@example.fr. Réessayez dans quelques instants.')

    await button(view, 'Envoyer un nouveau lien', 1).trigger('click')
    await vi.waitFor(() => expect(view.find('[role="alert"]').exists()).toBe(true))
    expect(view.get('[role="alert"]').text()).toBe('Ce compte est désactivé : il ne reçoit plus de lien.')
  })

  it('is the error page of a member who is not the superuser', async () => {
    mockApi('/api/board/accounts', { method: 'GET', handler: () => apiResponse(403, { detail: 'Accès réservé à l’administrateur des comptes.' }) })

    await mountPage()

    await vi.waitFor(() => expect(showErrorMock).toHaveBeenCalledWith({ status: 403, statusText: 'Forbidden' }))
  })
})
