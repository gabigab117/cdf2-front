import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MemoriesPage from '~/pages/memories/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { page } from '../../helpers/events'
import { publicAlbumItem } from '../../helpers/photos'

const ALBUMS = '/api/public/albums'

function mountMemories(route = '/souvenirs') {
  return mountSuspended(MemoriesPage, { route })
}

describe('the albums of the site, « Souvenirs »', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    clearApiMocks()
    clearNuxtData()
    await clearError()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('shows the albums, the latest first, and pages them by links', async () => {
    mockApi(ALBUMS, { handler: () => apiResponse(200, page([publicAlbumItem()], 30)) })
    const sent = recordRequests()

    const memories = await mountMemories()

    expect(sent.map(request => request.url)).toEqual(['/api/public/albums?page=1&page_size=24'])
    expect(memories.get('h1').text()).toBe('Souvenirs')
    expect(memories.get('nav[aria-label="Fil d’Ariane"]').text()).toBe('Accueil/Souvenirs')
    expect(memories.findAll('li a').map(link => link.attributes('href'))).toContain('/souvenirs/5-brocante-2026')
    expect(memories.find('a[href="/souvenirs?page=2"]').exists()).toBe(true)
  })

  it('reads the page its address asks for', async () => {
    mockApi(ALBUMS, { handler: () => apiResponse(200, page([], 30)) })
    const sent = recordRequests()

    const memories = await mountMemories('/souvenirs?page=3')

    expect(sent.map(request => request.url)).toEqual(['/api/public/albums?page=3&page_size=24'])
    expect(memories.text()).toContain('Cette page des albums est vide.')
    expect(memories.get('a[href="/souvenirs"]').text()).toBe('Revenir aux derniers albums')
  })

  it('says the photos are to come while the site has no album', async () => {
    mockApi(ALBUMS, { handler: () => apiResponse(200, page([])) })

    const memories = await mountMemories()

    expect(memories.text()).toContain('Les photos des prochaines fêtes arriveront ici.')
    expect(memories.find('ul').exists()).toBe(false)
  })

  it('can be tried again when the API fails at a change of page, which keeps the page mounted', async () => {
    mockApi(ALBUMS, { handler: () => apiResponse(200, page([publicAlbumItem()], 30)) })
    await mountMemories()
    mockApi(ALBUMS, { handler: () => apiResponse(503, {}) })

    await useRouter().push('/souvenirs?page=2')

    await vi.waitFor(() => expect(useError().value).toMatchObject({ status: 503, data: { path: '/souvenirs?page=2' } }))
  })

  it('can be tried again when the API is out of reach', async () => {
    mockApi(ALBUMS, { handler: () => apiResponse(503, {}) })

    await mountMemories()

    expect(useError().value).toMatchObject({ status: 503, data: { path: '/souvenirs' } })
  })
})
