import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventsDeletion from '~/components/events/Deletion.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { page } from '../../helpers/events'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const EVENT = '/api/board/events/{event_id}'

function mountDeletion() {
  return mountSuspended(EventsDeletion, { props: { event: { id: 12, title: 'Halloween des enfants' } }, attachTo: document.body })
}

function button(deletion: Awaited<ReturnType<typeof mountDeletion>>, text: string) {
  return deletion.findAll('button').find(element => element.text() === text)!
}

describe('EventsDeletion', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    navigateToMock.mockReset()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('asks in the page itself, never in a dialog of the browser', async () => {
    const confirm = vi.fn()
    vi.stubGlobal('confirm', confirm)
    const deletion = await mountDeletion()

    await button(deletion, 'Supprimer l’événement').trigger('click')

    expect(deletion.text()).toContain('Supprimer « Halloween des enfants » ?')
    expect(document.activeElement).toBe(deletion.get('[tabindex="-1"]').element)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('leaves the event as it is when the member changes their mind', async () => {
    const deletion = await mountDeletion()
    await button(deletion, 'Supprimer l’événement').trigger('click')

    await button(deletion, 'Annuler').trigger('click')

    expect(deletion.text()).not.toContain('Supprimer « Halloween des enfants » ?')
    expect(document.activeElement).toBe(button(deletion, 'Supprimer l’événement').element)
  })

  it('deletes the event, then leads back to the list', async () => {
    const handler = vi.fn(() => new Response(null, { status: 204 }))
    mockApi(EVENT, { method: 'DELETE', handler }, { event_id: 12 })
    const deletion = await mountDeletion()
    await button(deletion, 'Supprimer l’événement').trigger('click')

    await button(deletion, 'Supprimer définitivement').trigger('click')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/evenements', { replace: true }))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('says why the event could not be deleted, and stays', async () => {
    mockApi(EVENT, { method: 'DELETE', handler: () => apiResponse(502, 'Bad Gateway') }, { event_id: 12 })
    const deletion = await mountDeletion()
    await button(deletion, 'Supprimer l’événement').trigger('click')

    await button(deletion, 'Supprimer définitivement').trigger('click')

    await vi.waitFor(() => expect(deletion.find('[role="alert"]').exists()).toBe(true))
    expect(deletion.get('[role="alert"]').text()).toBe('Le service est momentanément indisponible. Réessayez dans quelques instants.')
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
