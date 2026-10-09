import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BoardUserCard from '~/components/board/UserCard.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const member = {
  email: 'camille.martin@example.test',
  first_name: 'Camille',
  last_name: 'Martin',
  position: 'Trésorière',
}

describe('BoardUserCard', () => {
  afterEach(() => {
    clearApiMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
  })

  it('shows the signed-in member and their position', async () => {
    useSessionStore().member = member

    const card = await mountSuspended(BoardUserCard)

    expect(card.text()).toContain('CMCamille MartinTrésorière')
  })

  it('shows the address of an account created without a name', async () => {
    /**
     * Given an account whose name was never filled in, such as one created
     * with createsuperuser
     * Then its e-mail address stands in for the name
     */
    useSessionStore().member = { ...member, first_name: '', last_name: '', position: '' }

    const card = await mountSuspended(BoardUserCard)

    expect(card.text()).toContain('camille.martin@example.test')
  })

  it('signs the member out, then opens the sign-in page', async () => {
    mockApi('/api/auth/logout', { method: 'POST', handler: () => new Response(null, { status: 204 }) })
    const session = useSessionStore()
    session.accessToken = 'access-1'
    session.member = member
    const card = await mountSuspended(BoardUserCard)

    await card.get('button[aria-label="Se déconnecter"]').trigger('click')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/connexion'))

    expect(session.accessToken).toBeNull()
  })

  it('says why the member is still signed in when signing out fails', async () => {
    /**
     * Given a server that cannot close the session for the time being
     * When the member signs out
     * Then they read why, and stay on the page, signed in
     */
    mockApi('/api/auth/logout', { method: 'POST', handler: () => apiResponse(503, { detail: 'Indisponible.' }) })
    useSessionStore().accessToken = 'access-1'
    const card = await mountSuspended(BoardUserCard)

    await card.get('button[aria-label="Se déconnecter"]').trigger('click')
    await vi.waitFor(() => expect(card.find('[role="alert"]').exists()).toBe(true))

    expect(card.get('[role="alert"]').text()).toBe(
      'Le service est momentanément indisponible. Réessayez dans quelques instants.',
    )
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(useSessionStore().accessToken).toBe('access-1')
  })
})
