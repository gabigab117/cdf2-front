import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import DashboardUpcomingEvents from '~/components/dashboard/UpcomingEvents.vue'
import { eventItem } from '../../helpers/events'

const halloween = eventItem()
const loto = eventItem({ id: 13, title: 'Loto d’automne', category: 'games', starts_at: '2026-11-15T13:00:00Z', ends_at: null, published: false })

describe('DashboardUpcomingEvents', () => {
  it('lists the next events with their day, the next one marked, each leading to its page', async () => {
    const table = await mountSuspended(DashboardUpcomingEvents, { props: { events: [halloween, loto], count: 2 } })

    const rows = table.findAll('li a')
    expect(rows.map(row => row.attributes('href'))).toEqual(['/bureau/evenements/12', '/bureau/evenements/13'])
    expect(rows.map(row => row.text())).toEqual(['Halloween des enfantssam. 31 oct.', 'Loto d’automnedim. 15 nov.'])
    expect(rows[0]!.get('time').attributes('datetime')).toBe('2026-10-31T14:00:00Z')
    expect(rows[0]!.get('span[aria-hidden]').classes()).toContain('bg-azur-600')
    expect(rows[1]!.get('span[aria-hidden]').classes()).toContain('bg-argent-400')
    expect(table.find('a[href="/bureau/evenements"]').exists()).toBe(false)
  })

  it('leads to the list when more events are to come than it shows', async () => {
    const table = await mountSuspended(DashboardUpcomingEvents, { props: { events: [halloween], count: 7 } })

    expect(table.get('a[href="/bureau/evenements"]').text()).toBe('Voir les 7 événements à venir')
  })

  it('offers to create an event, and says when none is to come', async () => {
    const table = await mountSuspended(DashboardUpcomingEvents, { props: { events: [], count: 0 } })

    expect(table.get('a[href="/bureau/evenements/nouveau"]').text()).toBe('Créer un événement')
    expect(table.text()).toContain('Aucun événement à venir.')
  })

  it('says nothing of the events while they load', async () => {
    const table = await mountSuspended(DashboardUpcomingEvents, { props: { events: [], count: 0, loading: true } })

    expect(table.attributes('aria-busy')).toBe('true')
    expect(table.text()).not.toContain('Aucun événement à venir.')
  })
})
