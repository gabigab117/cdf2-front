import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosEventTab from '~/components/photos/EventTab.vue'
import { button } from '../../helpers/form'
import { stubObjectUrls } from '../../helpers/files'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardEvent, eventItem, page } from '../../helpers/events'
import { albumItem, boardAlbum, eventCover, mockPhotoFiles } from '../../helpers/photos'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const COVER = '/api/board/events/{event_id}/cover'

function mountTab() {
  return mountSuspended(PhotosEventTab, { props: { event: boardEvent() }, attachTo: document.body })
}

describe('the Photos tab of an event', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00Z')
    mockApi('/api/board/albums', { method: 'GET', handler: () => apiResponse(200, page([albumItem({ id: 6, title: 'Halloween 2026', cover: null, published: false, photos_count: 0 })])) })
    mockApi(COVER, { method: 'GET', handler: () => apiResponse(200, eventCover()) }, { event_id: 12 })
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
    mockPhotoFiles([41, 42, 43])
    stubObjectUrls()
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('lists the event\'s albums, each leading to the Photos page, and shows its cover', async () => {
    const sent = recordRequests()
    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.find('a').exists()).toBe(true))
    expect(tab.get('a').attributes('href')).toBe('/bureau/photos?album=6')
    expect(tab.get('a').text()).toBe('Halloween 20260 photo · privé')
    expect(sent.find(request => request.url.startsWith('/api/board/albums'))?.url).toBe('/api/board/albums?event=12&page_size=100')
    await vi.waitFor(() => expect(tab.find('img[alt="Couverture de l’événement"]').exists()).toBe(true))
    expect(tab.text()).not.toContain('Le site ne la montre pas')
    expect(tab.text()).toContain('Retirer la couverture')
  })

  it('says when the site does not show its cover, and offers no choice without albums', async () => {
    clearApiMocks()
    mockApi('/api/board/albums', { method: 'GET', handler: () => apiResponse(200, page([])) })
    mockApi(COVER, { method: 'GET', handler: () => apiResponse(200, eventCover({ visible: false })) }, { event_id: 12 })
    mockPhotoFiles([41])
    const hidden = await mountTab()

    await vi.waitFor(() => expect(hidden.text()).toContain('Le site ne la montre pas : son album est privé, ou la photo est masquée ou à vérifier.'))
    expect(hidden.text()).toContain('Aucun album pour cet événement.')

    clearApiMocks()
    clearNuxtData()
    mockApi('/api/board/albums', { method: 'GET', handler: () => apiResponse(200, page([])) })
    mockApi(COVER, { method: 'GET', handler: () => apiResponse(200, eventCover({ cover: null, visible: false, albums: [] })) }, { event_id: 12 })
    const none = await mountTab()

    await vi.waitFor(() => expect(none.text()).toContain('Aucune couverture pour l’instant.'))
    expect(none.text()).toContain('Aucun album pour cet événement ni pour son édition précédente.')
    expect(button(none, 'Choisir la couverture')?.attributes('disabled')).toBeDefined()
    expect(none.text()).not.toContain('Retirer la couverture')
  })

  it('takes the cover off', async () => {
    mockApi(COVER, { method: 'PUT', handler: () => apiResponse(200, eventCover({ cover: null })) }, { event_id: 12 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.text()).toContain('Retirer la couverture'))

    await button(tab, 'Retirer la couverture')?.trigger('click')

    await vi.waitFor(() => expect(sent.some(request => request.method === 'PUT')).toBe(true))
    expect(sent.find(request => request.method === 'PUT')?.body).toEqual({ cover: null })
  })

  it('chooses a cover among the photos of the albums offered', async () => {
    /**
     * Given Halloween, its own album empty, and its previous edition's album of three photos
     * When a member opens the choice, picks the previous edition's album and its second photo
     * Then the albums are named with their day, the previous edition's said so
     * And the photo chosen is sent as the event's cover, and the choice closes
     */
    mockApi('/api/board/albums/{album_id}', { method: 'GET', handler: () => apiResponse(200, boardAlbum({ photos: [] })) }, { album_id: 6 })
    mockApi('/api/board/albums/{album_id}', { method: 'GET', handler: () => apiResponse(200, boardAlbum()) }, { album_id: 5 })
    mockApi(COVER, { method: 'PUT', handler: () => apiResponse(200, eventCover({ cover: 42 })) }, { event_id: 12 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.find('dialog').exists()).toBe(true))

    await button(tab, 'Choisir la couverture')?.trigger('click')
    const dialog = tab.get('dialog')
    expect((dialog.element as HTMLDialogElement).open).toBe(true)
    expect(dialog.findAll('option').map(option => option.text())).toEqual([
      'Halloween 2026 · 31 oct.',
      'Halloween 2025 · 31 oct. 2025 · édition précédente',
    ])
    await vi.waitFor(() => expect(dialog.text()).toContain('Aucune photo dans cet album.'))
    await dialog.get('select').setValue('5')
    await vi.waitFor(() => expect(dialog.findAll('button[aria-pressed]')).toHaveLength(3))
    expect(dialog.get('button[aria-pressed="true"]').text()).toContain('Photo 1')
    await dialog.findAll('button[aria-pressed]')[1]?.trigger('click')
    await button(dialog, 'Choisir')?.trigger('click')

    await vi.waitFor(() => expect(sent.find(request => request.method === 'PUT')?.body).toEqual({ cover: 42 }))
    await vi.waitFor(() => expect((dialog.element as HTMLDialogElement).open).toBe(false))
  })

  it('makes a new album for the event, which opens in the Photos page', async () => {
    mockApi('/api/board/albums', { method: 'POST', handler: () => apiResponse(201, boardAlbum({ id: 9 })) })
    const sent = recordRequests()
    const tab = await mountTab()

    await button(tab, 'Nouvel album')?.trigger('click')
    await tab.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ path: '/bureau/photos', query: { album: 9 } }))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({ title: 'Halloween des enfants', date: '2026-10-31', event: 12 })
  })
})
