import { describe, expect, it } from 'vitest'
import { julie } from '../helpers/events'
import { boardTask } from '../helpers/tasks'

const NOW = Date.parse('2026-10-10T08:00:00Z')

describe('the tasks of the board', () => {
  it.each([
    ['an open task, with its assignee and due date', boardTask(), 'Julie · avant le 8 oct.'],
    ['a task done, with when it was', boardTask({ done_at: '2026-09-25T09:00:00Z' }), 'Julie · fait le 25 sept.'],
    ['a task due another year', boardTask({ due_date: '2027-01-05' }), 'Julie · avant le 5 janv. 2027'],
    ['a task without assignee', boardTask({ assignee: null }), 'Avant le 8 oct.'],
    ['a task without due date', boardTask({ due_date: null }), 'Julie'],
    ['a task with neither', boardTask({ assignee: null, due_date: null }), ''],
    ['a member without a first name', boardTask({ assignee: { ...julie, first_name: '' } }), 'Roux · avant le 8 oct.'],
    ['an account without a name', boardTask({ assignee: { ...julie, first_name: '', last_name: '' } }), 'julie.roux@example.test · avant le 8 oct.'],
  ])('writes the line of %s', (_case, task, line) => {
    expect(taskLine(task, NOW)).toBe(line)
  })

  it('writes a task back whole, done as it is', () => {
    expect(receivedTaskIn(boardTask({ done_at: '2026-09-25T09:00:00Z' }))).toEqual({
      event: 12, title: 'Valider le devis sono', assignee: 7, due_date: '2026-10-08', done: true,
    })
  })

  it('edits a task, or a new one on an event, and sends no due date for an empty field', () => {
    expect(taskFields(boardTask(), 12)).toEqual({ event: 12, title: 'Valider le devis sono', assignee: 7, dueDate: '2026-10-08' })
    expect(taskFields(null, 12)).toEqual({ event: 12, title: '', assignee: null, dueDate: '' })
    expect(taskPayload({ event: 12, title: 'Affichettes', assignee: null, dueDate: '' }, false)).toEqual({
      event: 12, title: 'Affichettes', assignee: null, due_date: null, done: false,
    })
  })

  it('names the fields of a task for the errors its forms cannot place', () => {
    expect(taskFieldLabel('due_date')).toBe('Échéance')
    expect(taskFieldLabel('other')).toBe('other')
  })
})
