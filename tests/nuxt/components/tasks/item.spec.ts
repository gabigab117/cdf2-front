import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TasksItem from '~/components/tasks/Item.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardTask } from '../../helpers/tasks'

const TASK = '/api/board/tasks/{task_id}'

function mountItem(task = boardTask()) {
  return mountSuspended(TasksItem, { props: { task } })
}

describe('TasksItem', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-10T08:00:00Z')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('reads as the mockup writes a task: its title, then whom it is for and when', async () => {
    const item = await mountItem()

    expect(item.get('label').text().replaceAll(' ', ' ')).toBe('Valider le devis sonoJulie · avant le 8 oct.')
    expect((item.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('shows a task done ticked, struck through, with the day it was done', async () => {
    const item = await mountItem(boardTask({ done_at: '2026-09-25T09:00:00Z' }))

    expect((item.get('input').element as HTMLInputElement).checked).toBe(true)
    expect(item.get('.line-through').text()).toBe('Valider le devis sono')
    expect(item.text()).toContain('Julie · fait le 25 sept.')
  })

  it('ticks a task done: the API receives it whole, done', async () => {
    mockApi(TASK, { method: 'PUT', handler: () => apiResponse(200, boardTask()) }, { task_id: 51 })
    const sent = recordRequests()
    const item = await mountItem()

    await item.get('input').setValue(true)

    await vi.waitFor(() => expect(item.emitted('changed')).toHaveLength(1))
    expect(sent[0]?.body).toEqual({ event: 12, title: 'Valider le devis sono', assignee: 7, due_date: '2026-10-08', done: true })
  })

  it('unticks back a task the API could not change, and says why', async () => {
    mockApi(TASK, { method: 'PUT', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { task_id: 51 })
    const item = await mountItem()

    await item.get('input').setValue(true)

    await vi.waitFor(() => expect(item.find('[role="alert"]').exists()).toBe(true))
    expect(item.get('[role="alert"]').text()).toBe('Introuvable.')
    expect((item.get('input').element as HTMLInputElement).checked).toBe(false)
    expect(item.emitted('changed')).toBeUndefined()
  })
})
