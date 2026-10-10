import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TasksTab from '~/components/tasks/Tab.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardEvent, julie, page } from '../../helpers/events'
import { boardTask } from '../../helpers/tasks'

const { refreshNuxtDataMock } = vi.hoisted(() => ({ refreshNuxtDataMock: vi.fn() }))
// The count of the tab is the page's: the tab only asks for it again.
mockNuxtImport('refreshNuxtData', () => refreshNuxtDataMock)

const TASKS = '/api/board/tasks'
const TASK = '/api/board/tasks/{task_id}'

function mountTab(currentPage = 1) {
  return mountSuspended(TasksTab, { props: { event: boardEvent(), page: currentPage }, attachTo: document.body })
}

type Mounted = Awaited<ReturnType<typeof mountTab>>

function button(wrapper: Mounted, name: string) {
  return wrapper.findAll('button').find(element => element.text() === name || element.attributes('aria-label') === name)
}

describe('the « Tâches » tab', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-10T08:00:00Z')
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    refreshNuxtDataMock.mockReset()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('lists every task as the API orders them, and says when there is none', async () => {
    mockApi(TASKS, { handler: () => apiResponse(200, page([boardTask(), boardTask({ id: 52, title: 'Bonbons', done_at: '2026-09-25T09:00:00Z' })])) })
    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.findAll('li')).toHaveLength(2))
    expect(tab.findAll('li label').map(label => label.text().replaceAll(' ', ' '))).toEqual([
      'Valider le devis sonoJulie · avant le 8 oct.',
      'BonbonsJulie · fait le 25 sept.',
    ])

    clearApiMocks()
    mockApi(TASKS, { handler: () => apiResponse(200, page([])) })
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
    const empty = await mountTab(2)
    await vi.waitFor(() => expect(empty.text()).toContain('Aucune tâche pour cet événement.'))
  })

  it('adds a task to the event, then shows the tasks and their count again', async () => {
    /**
     * Given the tab of an event
     * When a member adds a task assigned to Julie, due on 8 October
     * Then the API receives an open task of the event
     * And the tasks and the count of the tab are fetched again, the form emptied
     */
    const listed = vi.fn(() => apiResponse(200, page([])))
    mockApi(TASKS, { handler: listed })
    mockApi(TASKS, { method: 'POST', handler: () => apiResponse(201, boardTask()) })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(listed).toHaveBeenCalledOnce())
    await vi.waitFor(() => expect(tab.findAll('option').map(option => option.text())).toContain('Julie Roux'))

    await tab.get('input:not([type])').setValue('Valider le devis sono')
    await tab.get('select').setValue('7')
    await tab.get('input[type="date"]').setValue('2026-10-08')
    await tab.get('form').trigger('submit')

    await vi.waitFor(() => expect(listed).toHaveBeenCalledTimes(2))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      event: 12, title: 'Valider le devis sono', assignee: 7, due_date: '2026-10-08', done: false,
    })
    expect(refreshNuxtDataMock).toHaveBeenCalledWith('board:event:12:dashboard')
    expect((tab.get('input:not([type])').element as HTMLInputElement).value).toBe('')
  })

  it('shows under its field why a task was refused', async () => {
    mockApi(TASKS, { handler: () => apiResponse(200, page([])) })
    mockApi(TASKS, { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body', 'assignee'], msg: 'Choisissez un membre du bureau.' }],
    }) })
    const tab = await mountTab()

    await tab.get('input:not([type])').setValue('Affichettes')
    await tab.get('form').trigger('submit')

    await vi.waitFor(() => expect(tab.text()).toContain('Choisissez un membre du bureau.'))
    expect(tab.get('select').attributes('aria-invalid')).toBe('true')
  })

  it('rewrites a task in place, done as it is', async () => {
    mockApi(TASKS, { handler: () => apiResponse(200, page([boardTask({ done_at: '2026-09-25T09:00:00Z' })])) })
    mockApi(TASK, { method: 'PUT', handler: () => apiResponse(200, boardTask()) }, { task_id: 51 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('li')).toHaveLength(1))

    await button(tab, 'Modifier la tâche')!.trigger('click')
    const forms = tab.findAll('form')
    await forms[1]!.get('input:not([type])').setValue('Valider le devis de la sono')
    await forms[1]!.get('input[type="date"]').setValue('')
    await forms[1]!.trigger('submit')

    await vi.waitFor(() => expect(sent.filter(request => request.method === 'PUT')).toHaveLength(1))
    expect(sent.find(request => request.method === 'PUT')?.body).toEqual({
      event: 12, title: 'Valider le devis de la sono', assignee: 7, due_date: null, done: true,
    })
  })

  it('deletes a task once asked in the page', async () => {
    const handler = vi.fn(() => new Response(null, { status: 204 }))
    mockApi(TASKS, { handler: () => apiResponse(200, page([boardTask()])) })
    mockApi(TASK, { method: 'DELETE', handler }, { task_id: 51 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('li')).toHaveLength(1))

    await button(tab, 'Supprimer la tâche')!.trigger('click')
    expect(tab.text()).toContain('Supprimer la tâche « Valider le devis sono » ?')
    await button(tab, 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce())
  })

  it('says why the tasks could not load, and leads from a page to the next', async () => {
    const handler = vi.fn(() => apiResponse(503, 'Service Unavailable'))
    mockApi(TASKS, { handler })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.find('[role="alert"]').exists()).toBe(true))

    handler.mockImplementation(() => apiResponse(200, page([boardTask()], 30)))
    await tab.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(tab.find('nav[aria-label="Pagination"] a').exists()).toBe(true))
    expect(tab.get('nav[aria-label="Pagination"] a').attributes('href')).toContain('onglet=taches&page=2')
  })
})
