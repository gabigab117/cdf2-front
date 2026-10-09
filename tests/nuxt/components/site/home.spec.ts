import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SiteAgenda from '~/components/site/Agenda.vue'
import SiteAgendaRow from '~/components/site/AgendaRow.vue'
import SiteCategoryPill from '~/components/site/CategoryPill.vue'
import SiteContact from '~/components/site/Contact.vue'
import SiteHero from '~/components/site/Hero.vue'
import SiteSpotlightCard from '~/components/site/SpotlightCard.vue'
import SiteVolunteerCall from '~/components/site/VolunteerCall.vue'
import type { components } from '~/types/api'
import { loto, page, publicEventItem } from '../../helpers/events'

type AgendaOut = components['schemas']['AgendaOut']

function readable(text: string): string {
  return text.replaceAll('\u00A0', ' ')
}

// Friday 9 October 2026, 10:00 in Paris.
const TODAY = Date.parse('2026-10-09T08:00:00Z')

// The configuration of the test environment (vitest.config.ts), which some
// tests change and every test gets back.
const config = () => useRuntimeConfig().public
let initial: { siteUrl: string, contact: { email: string, phone: string } }

beforeEach(() => {
  useNow().value = TODAY
  initial = { siteUrl: config().siteUrl, contact: { ...config().contact } }
})

afterEach(() => {
  clearNuxtState('now')
  config().siteUrl = initial.siteUrl
  Object.assign(config().contact, initial.contact)
})

describe('SiteCategoryPill', () => {
  it.each([
    ['children', 'Enfants', 'bg-azur-100'],
    ['meals', 'Repas', 'bg-argent-100'],
    ['markets', 'Marchés', 'bg-ambre-50'],
    ['games', 'Jeux', 'bg-argent-175'],
    ['festivities', 'Fêtes', 'bg-azur-600'],
  ] as const)('colours the category %s as the agenda does', async (category, label, background) => {
    const pill = await mountSuspended(SiteCategoryPill, { props: { category } })

    expect(pill.text()).toBe(label)
    expect(pill.classes()).toContain(background)
  })
})

describe('SiteHero', () => {
  it('names the season, from September to August', async () => {
    useNow().value = Date.parse('2027-08-31T12:00:00Z')

    const hero = await mountSuspended(SiteHero, { props: { spotlight: null } })

    expect(hero.text()).toContain('Saison 2026 – 2027')
  })

  it('shows the next event, and leads to the agenda and to the committee', async () => {
    const hero = await mountSuspended(SiteHero, { props: { spotlight: publicEventItem() } })

    expect(hero.get('h1').text()).toBe('Les fêtes du village, organisées par ses bénévoles.')
    expect(hero.get('article h2').text()).toBe('Halloween des enfants')
    expect(hero.findAll('a').map(link => link.attributes('href'))).toEqual([
      '/#agenda',
      '/#comite',
      '/evenements/halloween-des-enfants-2026',
    ])
  })

  it('shows no card when the agenda is empty', async () => {
    const hero = await mountSuspended(SiteHero, { props: { spotlight: null } })

    expect(hero.find('article').exists()).toBe(false)
  })
})

describe('SiteSpotlightCard', () => {
  it('counts the days to the next event, and says when and where it takes place', async () => {
    const card = await mountSuspended(SiteSpotlightCard, { props: { event: publicEventItem() } })

    const text = readable(card.text())
    expect(text).toContain('Prochain rendez-vous')
    expect(text).toContain('J-22')
    // The day in full on a computer, its weekday shortened on a phone.
    expect(card.get('.md\\:hidden').text()).toBe('Sam. 31 octobre')
    expect(card.get('.md\\:inline').text()).toBe('Samedi 31 octobre')
    expect(text).toContain('Samedi 31 octobre · 15 h 00')
    expect(text).toContain('Salle des fêtes · Gratuit, Goûter offert par le comité')
    expect(text).toContain('15 h 00 – 18 h 30')
    expect(text).toContain('Gratuit · Goûter offert par le comité')
  })

  it('says the next event is today', async () => {
    useNow().value = Date.parse('2026-10-31T07:00:00Z')

    const card = await mountSuspended(SiteSpotlightCard, { props: { event: publicEventItem() } })

    expect(card.text()).toContain('Aujourd’hui')
  })
})

describe('SiteAgendaRow', () => {
  it('shows the day in large, then the event, as a link to its page', async () => {
    const row = await mountSuspended(SiteAgendaRow, { props: { event: loto } })

    const text = readable(row.text())
    expect(row.get('a').attributes('href')).toBe('/evenements/loto-d-automne-2026')
    expect(row.get('h3').text()).toBe('Loto d’automne')
    expect(text).toContain('15nov. · dim.')
    expect(text).toContain('Ouverture 13 h 00')
    expect(text).toContain('Salle des fêtes · 13 h 00')
    expect(text).toContain('3 € le carton')
    expect(text).toContain('Jeux')
  })
})

describe('SiteAgenda', () => {
  const overview: AgendaOut = { categories: ['children', 'games'], updated_at: '2026-09-30T08:00:00Z' }

  function mountAgenda(props: Partial<InstanceType<typeof SiteAgenda>['$props']> = {}) {
    return mountSuspended(SiteAgenda, {
      props: {
        overview,
        events: page([publicEventItem(), loto]),
        query: { category: null, page: 1 },
        ...props,
      },
    })
  }

  it('lists the events to come, and filters them by the categories the agenda holds', async () => {
    const agenda = await mountAgenda()

    expect(agenda.findAll('h3').map(title => title.text())).toEqual(['Halloween des enfants', 'Loto d’automne'])
    const chips = agenda.findAll('nav[aria-label="Filtrer par type d’événement"] a')
    expect(chips.map(chip => [chip.text(), chip.attributes('href')])).toEqual([
      ['Tout', '/#agenda'],
      ['Enfants', '/?categorie=enfants#agenda'],
      ['Jeux', '/?categorie=jeux#agenda'],
    ])
    expect(chips.filter(chip => chip.attributes('aria-current')).map(chip => chip.text())).toEqual(['Tout'])
  })

  it('marks the category shown, and only it', async () => {
    const agenda = await mountAgenda({ query: { category: 'games', page: 1 } })

    const current = agenda.findAll('[aria-current="page"]')
    expect(current.map(chip => chip.text())).toEqual(['Jeux'])
  })

  it('subscribes the visitor\'s calendar to the agenda, at the site\'s address', async () => {
    const agenda = await mountAgenda()

    expect(agenda.get('a[href^="webcal:"]').attributes('href')).toBe('webcal://site.example/api/public/agenda.ics')
  })

  it('downloads the agenda when the site\'s address is not known', async () => {
    config().siteUrl = ''

    const agenda = await mountAgenda()

    expect(agenda.find('a[href="/api/public/agenda.ics"]').exists()).toBe(true)
  })

  it('says when the board last changed it, with the year once that year is over', async () => {
    expect((await mountAgenda()).text()).toContain('Mis à jour par le bureau le 30 septembre')

    const lastYear = await mountAgenda({ overview: { ...overview, updated_at: '2025-12-20T08:00:00Z' } })
    expect(lastYear.text()).toContain('Mis à jour par le bureau le 20 décembre 2025')

    const never = await mountAgenda({ overview: { categories: [], updated_at: null } })
    expect(never.text()).not.toContain('Mis à jour')
    expect(never.find('nav[aria-label="Filtrer par type d’événement"]').exists()).toBe(false)
  })

  it.each([
    ['the agenda is empty', { category: null, page: 1 }, 'Aucune manifestation à venir pour le moment.'],
    ['a category has no event to come', { category: 'meals', page: 1 }, 'Aucune manifestation à venir dans cette catégorie.'],
    ['a page lies past its end', { category: null, page: 3 }, 'Cette page de l’agenda est vide.'],
  ] as const)('says so when %s', async (_case, query, message) => {
    const agenda = await mountAgenda({ events: page([]), query })

    expect(agenda.text()).toContain(message)
    expect(agenda.find('a[href="/#agenda"]').exists()).toBe(true)
  })

  it('pages through a long agenda, keeping its category', async () => {
    const agenda = await mountAgenda({ events: page([loto], 30), query: { category: 'games', page: 1 } })

    expect(agenda.get('nav[aria-label="Pagination"] a').attributes('href')).toBe('/?categorie=jeux&page=2#agenda')
  })

  it('says the agenda cannot be shown, without a button that needs JavaScript', async () => {
    const agenda = await mountAgenda({ events: null, failed: true })

    expect(agenda.text()).toContain('L’agenda ne peut pas s’afficher pour le moment. Réessayez dans quelques minutes.')
    expect(agenda.find('button').exists()).toBe(false)
  })
})

describe('SiteVolunteerCall', () => {
  it('asks for a hand, and leads to the association\'s e-mail', async () => {
    const call = await mountSuspended(SiteVolunteerCall)

    expect(call.get('h2').text()).toBe('Un coup de main, une idée d’animation ?')
    expect(call.get('a').attributes('href')).toBe('mailto:contact@example.test')
    expect(call.text()).not.toContain('Le bureau')
  })

  it('has no button to write without an e-mail address', async () => {
    config().contact.email = ''

    const call = await mountSuspended(SiteVolunteerCall)

    expect(call.find('a').exists()).toBe(false)
  })
})

describe('SiteContact', () => {
  it('gives the association\'s contact details and its village hall', async () => {
    const contactDetails = await mountSuspended(SiteContact)

    expect(contactDetails.get('a').attributes('href')).toBe('mailto:contact@example.test')
    expect(contactDetails.text()).toContain('01 23 45 67 89')
    expect(contactDetails.text()).toContain('1 place de la Mairie00000 Commune')
  })

  it('leaves out what the configuration does not give', async () => {
    config().contact.email = ''
    config().contact.phone = ''

    const contactDetails = await mountSuspended(SiteContact)

    expect(contactDetails.text()).not.toContain('Contact')
    expect(contactDetails.text()).toContain('Salle des fêtes')
  })
})
