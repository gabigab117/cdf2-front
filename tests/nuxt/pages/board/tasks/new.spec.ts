import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NewTaskPage from '~/pages/board/tasks/new.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { eventItem, julie, page } from '../../../helpers/events'
import { boardTask } from '../../../helpers/tasks'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

function mountPage() {
  return mountSuspended(NewTaskPage, { route: '/bureau/taches/nouvelle', attachTo: document.body })
}

describe('the page of a new task', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem(), eventItem({ id: 13, title: 'Loto d’automne', starts_at: '2026-11-15T13:00:00Z' })])) })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('creates a task on an event to come, then shows it among the event\'s tasks', async () => {
    /**
     * Given the events to come
     * When a member chooses the loto, writes a title and creates the task
     * Then the API receives an open task of the loto
     * And the member lands on the loto's tasks
     */
    mockApi('/api/board/tasks', { method: 'POST', handler: () => apiResponse(201, boardTask({ event: 13 })) })
    const sent = recordRequests()
    const newTask = await mountPage()
    await vi.waitFor(() => expect(newTask.findAll('select')[0]!.findAll('option').map(option => option.text())).toEqual([
      'Choisir un événement',
      'Aucun événement (tâche générale)',
      'Halloween des enfants · sam. 31 oct.',
      'Loto d’automne · dim. 15 nov.',
    ]))

    await newTask.findAll('select')[0]!.setValue('13')
    await newTask.get('input:not([type])').setValue('Lots du loto')
    await newTask.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ path: '/bureau/evenements/13', query: { onglet: 'taches', page: undefined } }))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      event: 13, title: 'Lots du loto', assignee: null, due_date: null, done: false,
    })
  })

  it('creates a general task, then shows it among the general tasks', async () => {
    /**
     * Given the choice of no event
     * When a member creates a task on none
     * Then the API receives a task without an event (D10)
     * And the member lands on the general tasks
     */
    mockApi('/api/board/tasks', { method: 'POST', handler: () => apiResponse(201, boardTask({ event: null })) })
    const sent = recordRequests()
    const newTask = await mountPage()
    await vi.waitFor(() => expect(newTask.findAll('select')[0]!.findAll('option')).toHaveLength(4))

    await newTask.findAll('select')[0]!.setValue('general')
    await newTask.get('input:not([type])').setValue('Renouveler l’assurance')
    await newTask.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/taches'))
    expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ event: null, title: 'Renouveler l’assurance' })
  })

  it('sends nothing until an event is chosen', async () => {
    const sent = recordRequests()
    const newTask = await mountPage()

    await newTask.get('input:not([type])').setValue('Lots du loto')
    await newTask.get('form').trigger('submit')

    expect(sent.filter(request => request.method === 'POST')).toEqual([])
    expect(newTask.findAll('select')[0]!.attributes('required')).toBeDefined()
  })

  it('stays on the page with the reason a task was refused', async () => {
    mockApi('/api/board/tasks', { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body', 'event'], msg: 'Choisissez un événement existant.' }],
    }) })
    const newTask = await mountPage()
    await vi.waitFor(() => expect(newTask.findAll('select')[0]!.findAll('option')).toHaveLength(4))

    await newTask.findAll('select')[0]!.setValue('12')
    await newTask.get('input:not([type])').setValue('Lots du loto')
    await newTask.get('form').trigger('submit')

    await vi.waitFor(() => expect(newTask.text()).toContain('Choisissez un événement existant.'))
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
