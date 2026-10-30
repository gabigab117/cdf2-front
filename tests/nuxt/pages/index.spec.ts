import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { getQuery } from 'h3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../helpers/api'
import { loto, page, publicEventItem } from '../helpers/events'
import { publicAlbumItem } from '../helpers/photos'

const halloween = publicEventItem()

const fete = publicAlbumItem({ slug: '4-fete-du-14-juillet', title: 'Fête du 14 juillet', date: '2026-07-14' })

// The agenda as the API pages it: the spotlight asks for a single event. The
// albums of « Souvenirs » come along.
function mockAgenda(items = [halloween, loto]) {
  mockApi('/api/public/albums', { handler: () => apiResponse(200, page([publicAlbumItem(), fete])) })
  mockApi('/api/public/agenda', { handler: () => apiResponse(200, { categories: ['children', 'games'], updated_at: '2026-09-30T08:00:00Z' }) })
  mockApi('/api/public/events', {
    handler: event => apiResponse(200, getQuery(event).page_size === '1' ? page(items.slice(0, 1), items.length) : page(items)),
  })
}

describe('home page', () => {
  beforeEach(() => {
    useNow().value = Date.parse('2026-10-09T08:00:00Z')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    await useRouter().push('/')
  })

  // Registered last, run first: the page unmounts before the data is cleared.
  enableAutoUnmount(afterEach)

  it('shows the next event and the agenda', async () => {
    mockAgenda()

    const home = await mountSuspended(IndexPage)

    expect(home.get('article h2').text()).toBe('Halloween des enfants')
    expect(home.findAll('#agenda h3').map(title => title.text())).toEqual(['Halloween des enfants', 'Loto d’automne'])
    expect(home.text()).toContain('Mis à jour par le bureau le 30 septembre')
  })

  it('shows the latest albums under « Souvenirs », after the agenda', async () => {
    mockAgenda()

    const home = await mountSuspended(IndexPage)

    expect(home.findAll('section[id]').map(section => section.attributes('id')).slice(0, 2)).toEqual(['agenda', 'souvenirs'])
    expect(home.findAll('#souvenirs li a').map(link => link.attributes('href'))).toEqual([
      '/souvenirs/5-brocante-2026',
      '/souvenirs/4-fete-du-14-juillet',
    ])
  })

  it('still answers when « Souvenirs » cannot be read, and says so there', async () => {
    mockAgenda()
    mockApi('/api/public/albums', { handler: () => apiResponse(503, {}) })

    const home = await mountSuspended(IndexPage)

    expect(home.get('#souvenirs').text()).toContain('Les albums ne peuvent pas s’afficher pour le moment.')
    expect(home.findAll('#agenda h3')).toHaveLength(2)
  })

  it('reads the agenda of the category its address asks for, and the next event of the whole agenda', async () => {
    mockAgenda([loto])
    const sent = recordRequests()

    await mountSuspended(IndexPage, { route: '/?categorie=jeux' })

    expect(sent.map(request => request.url).sort()).toEqual([
      '/api/public/agenda',
      '/api/public/albums?page_size=4',
      '/api/public/events?category=games&page=1&page_size=25',
      '/api/public/events?page_size=1',
    ])
  })

  it('still answers when the agenda cannot be read', async () => {
    mockApi('/api/public/agenda', { handler: () => apiResponse(503, {}) })
    mockApi('/api/public/events', { handler: () => apiResponse(503, {}) })
    mockApi('/api/public/albums', { handler: () => apiResponse(503, {}) })

    const home = await mountSuspended(IndexPage)

    expect(home.get('h1').text()).toBe('Les fêtes du village, organisées par ses bénévoles.')
    expect(home.text()).toContain('L’agenda ne peut pas s’afficher pour le moment.')
    expect(home.find('article').exists()).toBe(false)
  })
})
