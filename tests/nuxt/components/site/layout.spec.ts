import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import SiteFooter from '~/components/site/Footer.vue'
import SiteHeader from '~/components/site/Header.vue'
import SiteNav from '~/components/site/Nav.vue'
import SitePreprodBanner from '~/components/site/PreprodBanner.vue'

afterEach(async () => {
  clearNuxtState('now')
  useRuntimeConfig().public.preprod = false
  await useRouter().push('/')
})

describe('SiteNav', () => {
  it('leads to the sections of the home page, none of them current there', async () => {
    const nav = await mountSuspended(SiteNav, { route: '/' })

    expect(nav.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Agenda', '/#agenda'],
      ['Le comité', '/#comite'],
      ['Contact', '/#contact'],
    ])
    expect(nav.findAll('[aria-current]')).toHaveLength(0)
  })

  it('lights the agenda on the page of an event, which belongs to it', async () => {
    const nav = await mountSuspended(SiteNav, { route: '/evenements/halloween-des-enfants-2026' })

    const current = nav.findAll('[aria-current]')
    expect(current.map(link => link.text())).toEqual(['Agenda'])
    expect(current[0]?.attributes('aria-current')).toBe('true')
    expect(current[0]?.classes()).toContain('bg-argent-100')
  })
})

describe('SiteHeader', () => {
  it('opens the menu of a phone and closes it with its own buttons, without any JavaScript', async () => {
    const header = await mountSuspended(SiteHeader)

    const menu = header.get('[popover]')
    const open = header.get('button[aria-label="Ouvrir le menu"]')
    const close = header.get('button[aria-label="Fermer le menu"]')
    expect(open.attributes('popovertarget')).toBe(menu.attributes('id'))
    expect(close.attributes()).toMatchObject({ popovertarget: menu.attributes('id'), popovertargetaction: 'hide' })
    expect(menu.findAll('a').map(link => link.text())).toEqual(['Agenda', 'Le comité', 'Contact'])
  })

  it('has no link to the board\'s space', async () => {
    const header = await mountSuspended(SiteHeader)

    expect(header.findAll('a').every(link => !link.attributes('href')?.startsWith('/bureau'))).toBe(true)
  })
})

describe('SiteFooter', () => {
  it('leads to the committee\'s contact details from any page but the home page', async () => {
    const onEvent = await mountSuspended(SiteFooter, { route: '/evenements/halloween-des-enfants-2026' })
    expect(onEvent.get('a').attributes('href')).toBe('/#contact')

    const onHome = await mountSuspended(SiteFooter, { route: '/' })
    expect(onHome.find('a').exists()).toBe(false)
  })

  it('dates its copyright with the year of the render, in Paris', async () => {
    // 1 January 2027 at 00:30 in Paris, still 2026 in UTC.
    useNow().value = Date.parse('2026-12-31T23:30:00Z')

    const footer = await mountSuspended(SiteFooter)

    expect(footer.text()).toContain('© 2027 Comité des Fêtes d’Ons-en-Bray')
  })
})

describe('SitePreprodBanner', () => {
  it('says the preproduction\'s data is fictitious', async () => {
    useRuntimeConfig().public.preprod = true

    const banner = await mountSuspended(SitePreprodBanner)

    expect(banner.text()).toBe('Préproduction — données fictives')
  })

  it('is absent elsewhere', async () => {
    const banner = await mountSuspended(SitePreprodBanner)

    expect(banner.text()).toBe('')
  })
})
