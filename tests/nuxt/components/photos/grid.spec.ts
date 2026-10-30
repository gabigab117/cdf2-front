import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosGrid from '~/components/photos/Grid.vue'
import PhotosRendition from '~/components/photos/Rendition.vue'
import { stubObjectUrls } from '../../helpers/files'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { boardAlbum, mockPhotoFiles } from '../../helpers/photos'

const URL_OF_PHOTO = 'blob:http://localhost:3000/photo'

beforeEach(() => {
  useSessionStore().accessToken = 'access-1'
  stubObjectUrls()
})

afterEach(() => {
  clearApiMocks()
  vi.restoreAllMocks()
  useSessionStore().clear()
})

// Registered last, run first: the components unmount before the mocks go.
enableAutoUnmount(afterEach)

describe('a rendition of a photo', () => {
  it('reads its size with the session, shows it, and releases it as it leaves', async () => {
    /**
     * Given a photo of the board, which an <img> alone could not read
     * When its display shows
     * Then it is read through the API and shown from a URL of the browser
     * And the URL is released once the thumbnail leaves
     */
    mockPhotoFiles([41], 'display')
    const thumbnail = await mountSuspended(PhotosRendition, { props: { photo: 41, rendition: 'display', alt: 'IMG_0042.webp', fit: 'contain' } })

    await vi.waitFor(() => expect(thumbnail.find('img').exists()).toBe(true))
    expect(thumbnail.get('img').attributes()).toMatchObject({ src: URL_OF_PHOTO, alt: 'IMG_0042.webp' })
    expect(thumbnail.get('img').classes()).toContain('object-contain')

    thumbnail.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(URL_OF_PHOTO)
  })

  it('stops its reading as it leaves', async () => {
    /**
     * Given a photo whose file is still on its way, as when a grid of 300 changes album
     * When it leaves
     * Then its reading stops, freeing the connection for the next album's
     */
    let reading: Request | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      reading = input as Request
      return new Promise<Response>(() => {})
    })
    const rendition = await mountSuspended(PhotosRendition, { props: { photo: 41 } })
    await vi.waitFor(() => expect(reading).toBeDefined())

    rendition.unmount()

    expect(reading?.signal.aborted).toBe(true)
  })

  it('shows a mark in its place when it cannot be read', async () => {
    mockApi('/api/board/photos/{photo_id}/{rendition}', { handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { photo_id: 99, rendition: 'thumbnail' })
    const thumbnail = await mountSuspended(PhotosRendition, { props: { photo: 99 } })

    await vi.waitFor(() => expect(thumbnail.find('svg').exists()).toBe(true))
    expect(thumbnail.find('img').exists()).toBe(false)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})

describe('the grid of an album\'s photos', () => {
  beforeEach(() => {
    mockPhotoFiles([41, 42, 43])
  })

  function mountGrid(selected: number[] = []) {
    return mountSuspended(PhotosGrid, {
      props: { photos: boardAlbum().photos, cover: 41, selected: new Set(selected), enlargeable: true },
    })
  }

  it('shows each photo as a tile pressed when selected, with its badges', async () => {
    /**
     * Given an album's three photos: the cover, another, and one hidden awaiting a check
     * And the second selected
     * Then each tile says its place and what marks it, the second pressed
     */
    const grid = await mountGrid([42])

    const tiles = grid.findAll('button[aria-pressed]')
    expect(tiles.map(tile => [tile.text().replace(/\s+/g, ' '), tile.attributes('aria-pressed')])).toEqual([
      ['Photo 1 Couverture', 'false'],
      ['Photo 2', 'true'],
      ['Photo 3 Masquée du site À vérifier', 'false'],
    ])
  })

  it('gives the photo pressed or enlarged', async () => {
    const grid = await mountGrid()

    await grid.findAll('button[aria-pressed]')[1]?.trigger('click')
    await grid.get('button[aria-label="Agrandir la photo 3"]').trigger('click')

    expect(grid.emitted('toggle')).toEqual([[boardAlbum().photos[1]]])
    expect(grid.emitted('enlarge')).toEqual([[boardAlbum().photos[2]]])
  })

  it('offers no enlargement where a photo is only chosen', async () => {
    const grid = await mountSuspended(PhotosGrid, { props: { photos: boardAlbum().photos, selected: new Set<number>() } })

    expect(grid.find('button[aria-label^="Agrandir"]').exists()).toBe(false)
    expect(grid.text()).not.toContain('Couverture')
  })
})
