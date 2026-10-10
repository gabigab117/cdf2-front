import type { components } from '~/types/api'
import { julie } from './events'
import { marc } from './notes'

type TaskOut = components['schemas']['TaskOut']

/** An open task of Halloween, assigned to Julie, due on Thursday 8 October 2026. */
export function boardTask(changes: Partial<TaskOut> = {}): TaskOut {
  return {
    id: 51,
    event: 12,
    title: 'Valider le devis sono',
    assignee: julie,
    due_date: '2026-10-08',
    done_at: null,
    created_by: marc,
    ...changes,
  }
}
