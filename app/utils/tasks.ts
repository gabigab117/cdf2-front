import type { components } from '~/types/api'

type TaskIn = components['schemas']['TaskIn']
type TaskOut = components['schemas']['TaskOut']
type BoardMemberOut = components['schemas']['BoardMemberOut']

/** The general tasks, those without an event (D10). */
export const GENERAL_TASKS_PATH = '/bureau/taches'

/** Where a task is created from the « Nouveau » menu. */
export const NEW_TASK_PATH = `${GENERAL_TASKS_PATH}/nouvelle`

/**
 * The choice of no event in a task's form, a general task: a value of its own,
 * the empty one being the select's invitation (UiSelect).
 */
export const NO_EVENT = 'general'

/** How many tasks a page of an event's tasks holds. */
export const TASKS_PAGE_SIZE = 25

/** « Gabriel », as a task names whom it is assigned to: « Julie R. » without a first name. */
export function memberFirstName(member: BoardMemberOut): string {
  return member.first_name || memberShortName(member)
}

/**
 * The line under a task's title: « Gabriel · avant le 8 oct. », « Sophie · fait
 * le 25 sept. », or only one of the two.
 */
export function taskLine(task: TaskOut, now: number): string {
  const { writtenDay, calendarDay } = useDateFormat()
  const when = task.done_at !== null
    ? `fait le ${writtenDay(task.done_at, now)}`
    : task.due_date !== null ? `avant le ${calendarDay(task.due_date, now)}` : null
  if (task.assignee === null) return when ? `${when.charAt(0).toUpperCase()}${when.slice(1)}` : ''
  const who = memberFirstName(task.assignee)
  return when ? `${who} · ${when}` : who
}

/** A task as the API gave it, to write it back whole. */
export function receivedTaskIn(task: TaskOut): TaskIn {
  return {
    event: task.event,
    title: task.title,
    assignee: task.assignee?.id ?? null,
    due_date: task.due_date,
    done: task.done_at !== null,
  }
}

/** What the task form edits. The date field gives an empty text for no due date. */
export interface TaskFields {
  event: number | null
  title: string
  assignee: number | null
  dueDate: string
}

/** The fields of a task to change, or of a new one on an event. */
export function taskFields(task: TaskOut | null, event: number | null): TaskFields {
  return {
    event: task?.event ?? event,
    title: task?.title ?? '',
    assignee: task?.assignee?.id ?? null,
    dueDate: task?.due_date ?? '',
  }
}

/** The task to send: the date field's empty text is no due date. */
export function taskPayload(fields: TaskFields, done: boolean): TaskIn {
  return {
    event: fields.event,
    title: fields.title,
    assignee: fields.assignee,
    due_date: fields.dueDate || null,
    done,
  }
}

const TASK_FIELD_LABELS: Readonly<Record<string, string>> = {
  event: 'Événement',
  title: 'Titre',
  assignee: 'Assignée à',
  due_date: 'Échéance',
  done: 'Faite',
}

/** The name of a field of a task, for an error the form cannot show under it. */
export function taskFieldLabel(path: string): string {
  return TASK_FIELD_LABELS[path] ?? path
}
