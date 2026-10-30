import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosAlbum from '~/components/photos/Album.vue'
import { button } from '../../helpers/form'
import { stubObjectUrls } from '../../helpers/files'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { boardAlbum, mockPhotoFiles, photo } from '../../helpers/photos'
import { readable } from '../../helpers/text'

const ALBUM = '/api/board/albums/{album_id}'

function mountAlbum() {
  return mountSuspended(PhotosAlbum, { props: { id: 5 }, attachTo: document.body })
}

type Album = Awaited<ReturnType<typeof mountAlbum>>

function tiles(album: Album) {
  return album.findAll('button[aria-pressed]')
}

describe('an album of the Photos page', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00Z')
    mockApi(ALBUM, { method: 'GET', handler: () => apiResponse(200, boardAlbum()) }, { album_id: 5 })
    mockPhotoFiles([41, 42, 43])
    mockPhotoFiles([42], 'display')
    stubObjectUrls()
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('shows its head and every photo, the cover marked', async () => {
    const album = await mountAlbum()

    await vi.waitFor(() => expect(tiles(album)).toHaveLength(3))
    expect(album.get('h1').text()).toBe('Brocante 2026')
    expect(tiles(album)[0]?.text()).toContain('Couverture')
    expect(album.find('[role="status"]').exists()).toBe(false)
  })

  it('selects photos one by one or all, then gives them up', async () => {
    /**
     * Given an album of three photos
     * When a member presses two tiles
     * Then they are pressed, and the bar counts them
     * And « Tout sélectionner » takes the third, until the bar gives them all up
     */
    const album = await mountAlbum()
    await vi.waitFor(() => expect(tiles(album)).toHaveLength(3))

    await tiles(album)[0]?.trigger('click')
    await tiles(album)[2]?.trigger('click')

    expect(tiles(album).map(tile => tile.attributes('aria-pressed'))).toEqual(['true', 'false', 'true'])
    expect(album.text()).toContain('2 photos sélectionnées')

    await tiles(album)[0]?.trigger('click')
    expect(album.text()).toContain('1 photo sélectionnée')
    await button(album, 'Tout sélectionner')?.trigger('click')
    expect(album.text()).toContain('3 photos sélectionnées')
    expect(button(album, 'Tout sélectionner')).toBeUndefined()

    await album.get('button[aria-label="Désélectionner"]').trigger('click')
    expect(tiles(album).every(tile => tile.attributes('aria-pressed') === 'false')).toBe(true)
    expect(album.text()).not.toContain('sélectionnée')
  })

  it('opens a photo in its viewer, in its display size, with what the board needs to judge it', async () => {
    /**
     * Given a photo taken at the brocante, added by Julie
     * When a member enlarges it
     * Then the viewer opens on its display, with its day, its hour and who added it
     */
    const album = await mountAlbum()
    await vi.waitFor(() => expect(tiles(album)).toHaveLength(3))

    await album.get('button[aria-label="Agrandir la photo 2"]').trigger('click')

    await vi.waitFor(() => expect((album.get('dialog').element as HTMLDialogElement).open).toBe(true))
    expect(album.get('dialog h2').text()).toBe('IMG_0043.webp')
    expect(readable(album.get('dialog header').text())).toContain('Prise le 13 septembre à 10 h 30 · ajoutée par Julie Roux')
    await vi.waitFor(() => expect(album.get('dialog img').attributes('alt')).toBe('IMG_0043.webp'))
  })

  it('fetches itself again, and tells the page, after a write', async () => {
    let reads = 0
    clearApiMocks()
    mockApi(ALBUM, { method: 'GET', handler: () => apiResponse(200, boardAlbum({ photos: reads++ ? [photo()] : boardAlbum().photos })) }, { album_id: 5 })
    mockApi('/api/board/albums/{album_id}/photos/delete', { method: 'POST', handler: () => new Response(null, { status: 204 }) }, { album_id: 5 })
    mockPhotoFiles([41, 42, 43])
    const album = await mountAlbum()
    await vi.waitFor(() => expect(tiles(album)).toHaveLength(3))

    await tiles(album)[1]?.trigger('click')
    await button(album, 'Supprimer')?.trigger('click')
    await button(album, 'Supprimer définitivement')?.trigger('click')

    await vi.waitFor(() => expect(tiles(album)).toHaveLength(1))
    expect(album.emitted('changed')).toHaveLength(1)
    expect(album.text()).not.toContain('sélectionnée')
  })

  it('opens its form in place of its head', async () => {
    mockApi('/api/board/events', { handler: () => apiResponse(200, { items: [], count: 0 }) })
    const album = await mountAlbum()
    await vi.waitFor(() => expect(album.find('h1').exists()).toBe(true))

    await button(album, 'Modifier')?.trigger('click')

    expect(album.find('h1').exists()).toBe(false)
    expect(album.get<HTMLInputElement>('input[maxlength]').element.value).toBe('Brocante 2026')
  })
})
