import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GeneralTasksPage from '~/pages/board/tasks/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { julie, page } from '../../../helpers/events'
import { boardTask } from '../../../helpers/tasks'

describe('the page of the general tasks', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('lists the tasks without an event, by page', async () => {
    const sent = recordRequests()
    mockApi('/api/board/tasks/general', { handler: () => apiResponse(200, page([boardTask({ event: null, title: 'Renouveler l’assurance' })], 30)) })

    const tasks = await mountSuspended(GeneralTasksPage, { route: '/bureau/taches?page=2' })

    await vi.waitFor(() => expect(tasks.text()).toContain('Renouveler l’assurance'))
    expect(tasks.get('h1').text()).toBe('Tâches générales')
    expect(sent.map(request => request.url)).toContain('/api/board/tasks/general?page=2&page_size=25')
    expect(tasks.get('nav[aria-label="Pagination"]').text()).toContain('Page 2 sur 2')
  })

  it('adds a general task, then lists it', async () => {
    /**
     * Given no general task yet
     * When a member adds one
     * Then the API receives a task without an event, and the list is fetched again
     */
    const list = vi.fn(() => apiResponse(200, page([])))
    mockApi('/api/board/tasks/general', { handler: list })
    mockApi('/api/board/tasks', { method: 'POST', handler: () => apiResponse(201, boardTask({ event: null })) })
    const sent = recordRequests()
    const tasks = await mountSuspended(GeneralTasksPage, { route: '/bureau/taches' })
    await vi.waitFor(() => expect(tasks.text()).toContain('Aucune tâche générale.'))

    await tasks.get('input:not([type])').setValue('Préparer l’AG')
    await tasks.get('form').trigger('submit')

    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ event: null, title: 'Préparer l’AG' })
  })
})
