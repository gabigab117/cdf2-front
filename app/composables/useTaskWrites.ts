import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type TaskIn = components['schemas']['TaskIn']

/**
 * Writes the board's tasks. Each write gives the errors to show on its form,
 * or null; the screens that show the tasks fetch them again.
 */
export function useTaskWrites() {
  const api = useApi()

  async function createTask(payload: TaskIn): Promise<FormErrors | null> {
    return (await formWrite(api.POST('/api/board/tasks', { body: payload }))).errors
  }

  /** Rewrites a task whole: ticking it done is a rewrite. */
  async function rewriteTask(id: number, payload: TaskIn): Promise<FormErrors | null> {
    const path = { task_id: id }
    return (await formWrite(api.PUT('/api/board/tasks/{task_id}', { params: { path }, body: payload }))).errors
  }

  /**
   * @returns null once deleted, or the message to show.
   */
  function deleteTask(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/tasks/{task_id}', { params: { path: { task_id: id } } }))
  }

  return { createTask, rewriteTask, deleteTask }
}
