import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosPage from '~/pages/board/photos/index.vue'
import { stubObjectUrls } from '../../../helpers/files'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { page } from '../../../helpers/events'
import { albumItem, boardAlbum, mockPhotoFiles } from '../../../helpers/photos'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const ALBUM = '/api/board/albums/{album_id}'

function mountPage(route = '/bureau/photos') {
  return mountSuspended(PhotosPage, { route, attachTo: document.body })
}

type Page = Awaited<ReturnType<typeof mountPage>>

// The column of the albums, and the album beside it.
function column(photosPage: Page) {
  return photosPage.get('section').element.parentElement
}

describe('the Photos page', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00Z')
    mockApi('/api/board/albums', { method: 'GET', handler: () => apiResponse(200, page([albumItem(), albumItem({ id: 7, title: 'Coulisses du bureau', published: false, cover: null, event: null })])) })
    mockApi(ALBUM, { method: 'GET', handler: () => apiResponse(200, boardAlbum()) }, { album_id: 5 })
    mockApi(ALBUM, { method: 'GET', handler: () => apiResponse(200, boardAlbum({ id: 7, title: 'Coulisses du bureau', published: false, photos: [] })) }, { album_id: 7 })
    mockPhotoFiles([41, 42, 43])
    stubObjectUrls()
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('shows the latest album beside the list', async () => {
    /**
     * Given two albums, the brocante's the latest
     * When the page opens wide, without an album in its address
     * Then the brocante's album shows beside the list, as the album chosen
     */
    const photosPage = await mountPage()

    await vi.waitFor(() => expect(photosPage.find('h1').text()).toBe('Brocante 2026'))
    expect(photosPage.get('a[aria-current="true"]').text()).toContain('Brocante 2026')
    expect(column(photosPage)?.classList.contains('max-md:hidden')).toBe(false)
  })

  it('shows the list alone on a phone, and reads no album it would hide', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList)
    const sent = recordRequests()
    const photosPage = await mountPage()

    await vi.waitFor(() => expect(photosPage.findAll('section a')).toHaveLength(2))
    expect(photosPage.get('h1').text()).toBe('Photos')
    // The list's cover alone, and no album's photos.
    expect(sent.map(request => request.url)).toEqual(['/api/board/albums?page_size=100', '/api/board/photos/41/thumbnail'])
  })

  it('shows the album its address names, which replaces the list on a phone', async () => {
    const photosPage = await mountPage('/bureau/photos?album=7')

    await vi.waitFor(() => expect(photosPage.find('h1').text()).toBe('Coulisses du bureau'))
    expect(photosPage.get('a[aria-current="true"]').text()).toContain('Coulisses du bureau')
    expect(column(photosPage)?.classList.contains('max-md:hidden')).toBe(true)
    expect(photosPage.get('a[href="/bureau/photos"]').text()).toBe('Albums')
  })

  it('opens an album once created, and comes back to the list once one is deleted', async () => {
    mockApi('/api/board/albums', { method: 'POST', handler: () => apiResponse(201, boardAlbum({ id: 9 })) })
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })
    const photosPage = await mountPage()
    await vi.waitFor(() => expect(photosPage.find('h1').exists()).toBe(true))

    await photosPage.get('button[aria-label="Nouvel album"]').trigger('click')
    await photosPage.get('section input[maxlength]').setValue('Repas des aînés')
    await photosPage.get('section input[type="date"]').setValue('2026-11-29')
    await photosPage.get('section form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ path: '/bureau/photos', query: { album: 9 } }))
  })

  it('names the page when there is no album yet', async () => {
    clearApiMocks()
    mockApi('/api/board/albums', { method: 'GET', handler: () => apiResponse(200, page([])) })
    const photosPage = await mountPage()

    await vi.waitFor(() => expect(photosPage.text()).toContain('Aucun album pour l’instant'))
    expect(photosPage.get('h1').text()).toBe('Photos')
  })
})
