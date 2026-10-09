import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { getQuery } from 'h3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../helpers/api'
import { loto, page, publicEventItem } from '../helpers/events'

const halloween = publicEventItem()

// The agenda as the API pages it: the spotlight asks for a single event.
function mockAgenda(items = [halloween, loto]) {
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

  it('reads the agenda of the category its address asks for, and the next event of the whole agenda', async () => {
    mockAgenda([loto])
    const sent = recordRequests()

    await mountSuspended(IndexPage, { route: '/?categorie=jeux' })

    expect(sent.map(request => request.url).sort()).toEqual([
      '/api/public/agenda',
      '/api/public/events?category=games&page=1&page_size=25',
      '/api/public/events?page_size=1',
    ])
  })

  it('still answers when the agenda cannot be read', async () => {
    mockApi('/api/public/agenda', { handler: () => apiResponse(503, {}) })
    mockApi('/api/public/events', { handler: () => apiResponse(503, {}) })

    const home = await mountSuspended(IndexPage)

    expect(home.get('h1').text()).toBe('Les fêtes du village, organisées par ses bénévoles.')
    expect(home.text()).toContain('L’agenda ne peut pas s’afficher pour le moment.')
    expect(home.find('article').exists()).toBe(false)
  })
})
