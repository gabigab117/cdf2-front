import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SiteDateBlock from '~/components/site/DateBlock.vue'
import SiteEventFacts from '~/components/site/EventFacts.vue'
import SiteMapPreview from '~/components/site/MapPreview.vue'
import SiteNextEvents from '~/components/site/NextEvents.vue'
import SitePracticalInfos from '~/components/site/PracticalInfos.vue'
import SiteProgramme from '~/components/site/Programme.vue'
import SiteShareButton from '~/components/site/ShareButton.vue'
import { loto, publicEvent, publicEventItem } from '../../helpers/events'

function readable(text: string): string {
  return text.replaceAll(' ', ' ')
}

// Friday 9 October 2026, 10:00 in Paris.
const TODAY = Date.parse('2026-10-09T08:00:00Z')

beforeEach(() => {
  useNow().value = TODAY
})

afterEach(() => {
  clearNuxtState('now')
  vi.restoreAllMocks()
})

describe('SiteDateBlock', () => {
  it('shows the day of the event and the days left before it', async () => {
    const block = await mountSuspended(SiteDateBlock, { props: { event: publicEvent() } })

    expect(block.text()).toBe('samedi31 oct. Dans 22 jours')
  })

  it('says an event is over on its page, which it keeps', async () => {
    useNow().value = Date.parse('2026-11-02T08:00:00Z')

    const block = await mountSuspended(SiteDateBlock, { props: { event: publicEvent() } })

    expect(block.text()).toContain('Événement passé')
  })
})

describe('SiteProgramme', () => {
  it('lists the programme at the times of the API, in its order', async () => {
    const programme = await mountSuspended(SiteProgramme, { props: { items: publicEvent().programme } })

    expect(programme.get('h2').text()).toBe('Au programme')
    expect(programme.findAll('li').map(line => line.text())).toEqual([
      '15:00Accueil et maquillageSalle des fêtes.',
      '17:00Goûter',
    ])
  })
})

describe('SitePracticalInfos', () => {
  it('gives each piece of practical information its card, with its icon', async () => {
    const infos = await mountSuspended(SitePracticalInfos, { props: { infos: publicEvent().practical_infos } })

    expect(infos.get('h2').text()).toBe('Bon à savoir')
    expect(infos.get('li').text()).toBe('Enfants accompagnésUn adulte par groupe.')
    expect(infos.find('li svg').exists()).toBe(true)
  })
})

describe('SiteEventFacts', () => {
  it('says when, where and how much, and adds the event to the visitor\'s calendar', async () => {
    const facts = await mountSuspended(SiteEventFacts, { props: { event: publicEvent() } })

    const text = readable(facts.text())
    expect(text).toContain('Samedi 31 octobre 202615 h 00 – 18 h 30')
    expect(text).toContain('Salle des fêtes1 place de la Mairie')
    expect(text).toContain('€GratuitGoûter offert par le comité')
    const calendar = facts.get('a[href="/api/public/events/halloween-des-enfants-2026.ics"]')
    expect(calendar.text()).toBe('Mon agenda')
    expect(facts.get('a[href="mailto:contact@example.test"]').text()).toBe('contact@example.test')
  })

  it('shows the map only for an event with its coordinates', async () => {
    const withMap = await mountSuspended(SiteEventFacts, { props: { event: publicEvent() } })
    expect(withMap.find('a[href^="https://www.openstreetmap.org"]').exists()).toBe(true)

    const withoutMap = await mountSuspended(SiteEventFacts, {
      props: { event: publicEvent({ latitude: null, longitude: null }) },
    })
    expect(withoutMap.find('a[href^="https://www.openstreetmap.org"]').exists()).toBe(false)
  })

  it('writes the days of an event over several days', async () => {
    const event = publicEvent({ starts_at: '2026-06-20T19:00:00Z', ends_at: '2026-06-20T23:00:00Z', price_label: '', price_detail: '' })

    const facts = await mountSuspended(SiteEventFacts, { props: { event } })

    expect(readable(facts.text())).toContain('Du sam. 20 au dim. 21 juin 202621 h 00 – 1 h 00')
    expect(facts.text()).not.toContain('€')
  })
})

describe('SiteMapPreview', () => {
  const props = { latitude: 46.5, longitude: 2.4, venue: 'Salle des fêtes' }

  it('calls no third party before the visitor asks, and opens OpenStreetMap without JavaScript', async () => {
    const preview = await mountSuspended(SiteMapPreview, { props })

    expect(preview.find('iframe').exists()).toBe(false)
    expect(preview.attributes()).toMatchObject({
      'href': 'https://www.openstreetmap.org/?mlat=46.5&mlon=2.4#map=17/46.5/2.4',
      'target': '_blank',
      'aria-label': 'Afficher le plan d’accès : Salle des fêtes (OpenStreetMap)',
    })
  })

  it('loads the map of OpenStreetMap in its place on a click', async () => {
    const preview = await mountSuspended(SiteMapPreview, { props })

    await preview.trigger('click')

    const map = preview.get('iframe')
    expect(map.attributes('title')).toBe('Plan d’accès : Salle des fêtes')
    expect(map.attributes('src')).toBe(
      'https://www.openstreetmap.org/export/embed.html?bbox=2.396,46.498,2.404,46.502&layer=mapnik&marker=46.5,2.4',
    )
  })
})

describe('SiteShareButton', () => {
  // The test environment has no sharing sheet: each test gives the browser
  // the one it needs, which it then loses.
  const stubbed: string[] = []

  function stubNavigator(properties: Record<string, unknown>) {
    for (const [name, value] of Object.entries(properties)) {
      Object.defineProperty(navigator, name, { value, configurable: true })
      stubbed.push(name)
    }
  }

  afterEach(() => {
    for (const name of stubbed.splice(0)) Reflect.deleteProperty(navigator, name)
  })

  it('shares the page with the device\'s own sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share })
    const button = await mountSuspended(SiteShareButton, { props: { title: 'Halloween des enfants' } })

    await button.get('button').trigger('click')

    expect(share).toHaveBeenCalledWith({ title: 'Halloween des enfants', url: window.location.href })
  })

  it('copies the address where the device has no sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share: undefined, clipboard: { writeText } })
    const button = await mountSuspended(SiteShareButton, { props: { title: 'Halloween des enfants' } })

    await button.get('button').trigger('click')
    await vi.waitFor(() => expect(button.get('button').text()).toBe('Lien copié'))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(button.get('[aria-live]').text()).toBe('Le lien de la page est copié.')
  })

  it('copies nothing when the visitor closes the sheet', async () => {
    const writeText = vi.fn()
    stubNavigator({ share: vi.fn().mockRejectedValue(new DOMException('Annulé', 'AbortError')), clipboard: { writeText } })
    const button = await mountSuspended(SiteShareButton, { props: { title: 'Halloween des enfants' } })

    await button.get('button').trigger('click')

    expect(writeText).not.toHaveBeenCalled()
    expect(button.get('button').text()).toBe('Partager')
  })
})

describe('SiteNextEvents', () => {
  it('leads to the events that come next, their tiles black then azur', async () => {
    const market = publicEventItem({ slug: 'marche-de-noel-2026', title: 'Marché de Noël', starts_at: '2026-12-13T09:00:00Z' })

    const next = await mountSuspended(SiteNextEvents, { props: { events: [loto, market] } })

    expect(next.get('h2').text()).toBe('Ensuite au programme')
    const cards = next.findAll('a')
    expect(cards.map(card => card.attributes('href'))).toEqual(['/evenements/loto-d-automne-2026', '/evenements/marche-de-noel-2026'])
    expect(readable(cards[0]?.text() ?? '')).toBe('15nov.Loto d’automneSalle des fêtes · Ouverture 13 h 00')
    expect(cards[0]?.get('span').classes()).toContain('bg-sable-950')
    expect(cards[1]?.get('span').classes()).toContain('bg-azur-600')
  })
})
