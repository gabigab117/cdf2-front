import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import BoardSidebar from '~/components/board/Sidebar.vue'
import BoardUpcomingEvents from '~/components/board/UpcomingEvents.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { eventItem, page } from '../../helpers/events'

const coming = [
  eventItem({ id: 12, title: 'Halloween des enfants' }),
  eventItem({ id: 13, title: 'Loto d’automne', starts_at: '2026-11-15T13:00:00Z' }),
  eventItem({ id: 14, title: 'Marché de Noël', starts_at: '2026-12-13T09:00:00Z' }),
]

function mockUpcoming(items = coming, count = 5) {
  const handler = vi.fn(() => apiResponse(200, page(items, count)))
  mockApi('/api/board/events', { handler })
  return handler
}

describe('BoardUpcomingEvents', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('leads to the next three events, by their day', async () => {
    mockUpcoming()

    const block = await mountSuspended(BoardUpcomingEvents, { route: '/bureau' })
    await vi.waitFor(() => expect(block.findAll('a')).toHaveLength(3))

    const links = block.findAll('a')
    expect(block.get('nav').attributes('aria-labelledby')).toBe(block.get('span').attributes('id'))
    expect(links.map(link => link.text())).toEqual([
      'Halloween des enfants31/10',
      'Loto d’automne15/11',
      'Marché de Noël13/12',
    ])
    expect(links.map(link => link.attributes('href'))).toEqual([
      '/bureau/evenements/12',
      '/bureau/evenements/13',
      '/bureau/evenements/14',
    ])
  })

  it('marks the next event, and the event open', async () => {
    /**
     * Given a member on the edit form of the Loto
     * Then Halloween, the next event, stands out
     * And the Loto's line is the current one
     */
    mockUpcoming()

    const block = await mountSuspended(BoardUpcomingEvents, { route: '/bureau/evenements/13/modifier' })
    await vi.waitFor(() => expect(block.findAll('a')).toHaveLength(3))

    const dots = block.findAll('a > span:first-child').map(dot => dot.classes())
    expect(dots[0]).toContain('bg-azur-400')
    expect(dots[1]).toContain('bg-argent-600')
    expect(block.findAll('a[aria-current="page"]').map(link => link.text())).toEqual(['Loto d’automne15/11'])
  })

  it('is not shown when no event is to come', async () => {
    const handler = mockUpcoming([], 0)

    const block = await mountSuspended(BoardUpcomingEvents, { route: '/bureau' })
    await vi.waitFor(() => expect(handler).toHaveBeenCalled())

    expect(block.find('nav').exists()).toBe(false)
  })

  it('shows the events again once one was written', async () => {
    const handler = mockUpcoming()
    const block = await mountSuspended(BoardUpcomingEvents, { route: '/bureau' })
    await vi.waitFor(() => expect(block.findAll('a')).toHaveLength(3))

    handler.mockImplementation(() => apiResponse(200, page(coming.slice(1), 4)))
    await refreshUpcomingEvents()

    await vi.waitFor(() => expect(block.findAll('a')).toHaveLength(2))
  })

  it('asks the API once for the two sidebars of the board', async () => {
    /**
     * Given the board's layout, which holds a sidebar for large screens and
     * one in the drawer of small screens
     * Then the navigation's count and the coming events of both come from a
     * single request
     */
    const handler = mockUpcoming()
    const TwoSidebars = defineComponent({ render: () => [h(BoardSidebar), h(BoardSidebar)] })

    const sidebars = await mountSuspended(TwoSidebars, { route: '/bureau' })
    await vi.waitFor(() => expect(sidebars.findAll('nav[aria-labelledby] a')).toHaveLength(6))

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
