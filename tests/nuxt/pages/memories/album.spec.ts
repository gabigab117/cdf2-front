import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AlbumPage from '~/pages/memories/[album].vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { publicAlbum } from '../../helpers/photos'

const ALBUM = '/api/public/albums/{album_id}'

function mountAlbum(address = '5-brocante-2026') {
  return mountSuspended(AlbumPage, { route: `/souvenirs/${address}` })
}

describe('the page of an album of the site', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    clearApiMocks()
    clearNuxtData()
    await clearError()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('shows the album\'s day, its number of photos and its grid, and names no one', async () => {
    mockApi(ALBUM, { handler: () => apiResponse(200, publicAlbum()) }, { album_id: 5 })
    const sent = recordRequests()

    const album = await mountAlbum()

    expect(sent.map(request => request.url)).toEqual(['/api/public/albums/5'])
    expect(album.get('nav[aria-label="Fil d’Ariane"]').text()).toBe('Souvenirs/Brocante 2026')
    expect(album.get('h1').text()).toBe('Brocante 2026')
    expect(album.get('header p').text()).toBe('Dimanche 13 septembre 2026 · 2 photos')
    expect(album.findAll('ul a').map(link => link.attributes('href'))).toEqual([
      '/api/public/photos/41/display',
      '/api/public/photos/42/display',
    ])
  })

  it('leads an address whose title has changed to the album\'s current one', async () => {
    mockApi(ALBUM, { handler: () => apiResponse(200, publicAlbum()) }, { album_id: 5 })

    await mountAlbum('5-brocante')

    expect(useRouter().currentRoute.value.path).toBe('/souvenirs/5-brocante-2026')
  })

  it('is not found for an address without a number, without asking the API', async () => {
    const sent = recordRequests()

    await mountAlbum('brocante-2026')

    expect(sent).toEqual([])
    expect(useError().value).toMatchObject({ status: 404, fatal: true })
  })

  it('is not found when the site does not show the album', async () => {
    mockApi(ALBUM, { handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { album_id: 5 })

    await mountAlbum()

    expect(useError().value).toMatchObject({ status: 404, fatal: true })
  })

  it('can be tried again when the API is out of reach', async () => {
    mockApi(ALBUM, { handler: () => apiResponse(503, {}) }, { album_id: 5 })

    await mountAlbum()

    expect(useError().value).toMatchObject({ status: 503, data: { path: '/souvenirs/5-brocante-2026' } })
  })
})
