import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TasksBlock from '~/components/tasks/Block.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { boardTask } from '../../helpers/tasks'

const DASHBOARD = '/api/board/events/{event_id}/dashboard'

function dashboard(changes = {}) {
  return {
    notes_count: 6,
    tasks_done: 9,
    tasks_total: 14,
    next_tasks: [boardTask(), boardTask({ id: 52, title: 'Trouver 2 bénévoles' })],
    recently_done_tasks: [boardTask({ id: 53, title: 'Commander bonbons et goûter', done_at: '2026-09-25T09:00:00Z' })],
    ...changes,
  }
}

function mountBlock() {
  return mountSuspended(TasksBlock, { props: { eventId: 12 } })
}

describe('TasksBlock', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-10T08:00:00Z')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('tells how far the tasks have gone, the next ones, then the last done', async () => {
    mockApi(DASHBOARD, { handler: () => apiResponse(200, dashboard()) }, { event_id: 12 })

    const block = await mountBlock()

    await vi.waitFor(() => expect(block.find('h2').exists()).toBe(true))
    expect(block.get('header').text()).toBe('Tâches 9 / 14')
    expect(block.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('9')
    expect(block.findAll('li').map(item => item.get('label > span > span').text())).toEqual([
      'Valider le devis sono', 'Trouver 2 bénévoles', 'Commander bonbons et goûter',
    ])
    expect(block.get('a').text()).toBe('Voir les 14 tâches')
    expect(block.get('a').attributes('href')).toBe('/?onglet=taches')
  })

  it('leads to the tasks to add the first one', async () => {
    mockApi(DASHBOARD, { handler: () => apiResponse(200, dashboard({ tasks_done: 0, tasks_total: 0, next_tasks: [], recently_done_tasks: [] })) }, { event_id: 12 })

    const block = await mountBlock()

    await vi.waitFor(() => expect(block.text()).toContain('Aucune tâche pour l’instant.'))
    expect(block.get('a').text()).toBe('Ajouter une tâche')
  })

  it('fetches the figures again once a task is ticked', async () => {
    const handler = vi.fn(() => apiResponse(200, dashboard()))
    mockApi(DASHBOARD, { handler }, { event_id: 12 })
    mockApi('/api/board/tasks/{task_id}', { method: 'PUT', handler: () => apiResponse(200, boardTask()) }, { task_id: 51 })
    const block = await mountBlock()
    await vi.waitFor(() => expect(block.findAll('li')).toHaveLength(3))

    await block.get('input').setValue(true)

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(2))
  })
})
