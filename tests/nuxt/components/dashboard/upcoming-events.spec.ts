import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import DashboardUpcomingEvents from '~/components/dashboard/UpcomingEvents.vue'
import { overviewEvent } from '../../helpers/events'

const halloween = overviewEvent()
const loto = overviewEvent({ id: 13, title: 'Loto d’automne', category: 'games', starts_at: '2026-11-15T13:00:00Z', ends_at: null, published: false, tasks_done: 0, tasks_total: 9, notes_count: 1 })

describe('DashboardUpcomingEvents', () => {
  it('lists the next events with their day, the next one marked, each leading to its page', async () => {
    const table = await mountSuspended(DashboardUpcomingEvents, { props: { events: [halloween, loto], count: 2 } })

    const rows = table.findAll('li a')
    expect(rows.map(row => row.attributes('href'))).toEqual(['/bureau/evenements/12', '/bureau/evenements/13'])
    expect(rows.map(row => row.text())).toEqual(['Halloween des enfantssam. 31 oct.9/14Notes : 6', 'Loto d’automnedim. 15 nov.0/9Notes : 1'])
    expect(rows[0]!.get('time').attributes('datetime')).toBe('2026-10-31T14:00:00Z')
    expect(rows[0]!.get('span[aria-hidden]').classes()).toContain('bg-azur-600')
    expect(rows[1]!.get('span[aria-hidden]').classes()).toContain('bg-argent-400')
    expect(table.find('a[href="/bureau/evenements"]').exists()).toBe(false)
  })

  it('shows how far the tasks of each event have gone, and its notes, beyond a phone\'s width', async () => {
    const table = await mountSuspended(DashboardUpcomingEvents, { props: { events: [halloween], count: 1 } })

    const row = table.get('li a')
    expect(row.get('[role="progressbar"]').attributes()).toMatchObject({ 'aria-valuenow': '9', 'aria-valuemax': '14', 'aria-label': 'Tâches faites' })
    expect(table.findAll('[aria-hidden="true"] > span').map(cell => cell.text())).toEqual(['Événement', 'Date', 'Tâches', 'Notes'])
    expect(row.findAll(':scope > span').slice(1).every(cell => cell.classes().includes('md:flex'))).toBe(true)
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
