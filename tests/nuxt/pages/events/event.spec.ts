import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import EventPage from '~/pages/events/[slug].vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { publicEvent } from '../../helpers/events'
import { publicAlbum } from '../../helpers/photos'

const EVENT = '/api/public/events/{slug}'
const SLUG = 'halloween-des-enfants-2026'

function mountEvent() {
  return mountSuspended(EventPage, { route: `/evenements/${SLUG}` })
}

describe('public page of an event', () => {
  beforeEach(() => {
    useNow().value = Date.parse('2026-10-09T08:00:00Z')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    await clearError()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('shows the event as the mockup does, without any registration (D1)', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, publicEvent()) }, { slug: SLUG })

    const eventPage = await mountEvent()

    expect(eventPage.get('nav[aria-label="Fil d’Ariane"]').text()).toBe('Agenda/Halloween des enfants')
    expect(eventPage.get('h1').text()).toBe('Halloween des enfants')
    expect(eventPage.text()).toContain('EnfantsGratuit')
    expect(eventPage.text()).toContain('Défilé costumé, chasse aux bonbons, puis goûter.')
    expect(eventPage.findAll('h2').map(title => title.text())).toEqual(['Au programme', 'Bon à savoir', 'Ensuite au programme'])
    expect(eventPage.text()).not.toContain('S’inscrire')
  })

  it('shows its cover, and last year\'s album after « Bon à savoir », as the mockup does', async () => {
    mockApi(EVENT, {
      handler: () => apiResponse(200, publicEvent({ cover: 41, previous_edition_album: publicAlbum() })),
    }, { slug: SLUG })

    const eventPage = await mountEvent()

    expect(eventPage.get('header img').attributes('src')).toBe('/api/public/photos/41/display')
    expect(eventPage.findAll('h2').map(title => title.text())).toEqual(['Au programme', 'Bon à savoir', 'L’an dernier', 'Ensuite au programme'])
    expect(eventPage.get('a[href="/souvenirs/5-brocante-2026"]').text()).toContain('Album Brocante 2026 · 2 photos')
  })

  it('leaves out the blocks the event does not fill', async () => {
    mockApi(EVENT, {
      handler: () => apiResponse(200, publicEvent({ programme: [], practical_infos: [], next_events: [], summary: '' })),
    }, { slug: SLUG })

    const eventPage = await mountEvent()

    expect(eventPage.findAll('h2')).toHaveLength(0)
    expect(eventPage.text()).not.toContain('Défilé')
    expect(eventPage.find('img').exists()).toBe(false)
  })

  // The error a page throws becomes the error the application shows (error.vue).
  it('is not found when the event is a draft or unknown', async () => {
    mockApi(EVENT, { handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { slug: SLUG })

    await mountEvent()

    expect(useError().value).toMatchObject({ status: 404, fatal: true })
  })

  it('can be tried again when the API is out of reach', async () => {
    mockApi(EVENT, { handler: () => apiResponse(503, {}) }, { slug: SLUG })

    await mountEvent()

    expect(useError().value).toMatchObject({ status: 503, data: { path: `/evenements/${SLUG}` } })
  })
})
