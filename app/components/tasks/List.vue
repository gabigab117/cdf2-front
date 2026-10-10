<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { TaskFields } from '~/utils/tasks'

type TaskOut = components['schemas']['TaskOut']

// Tasks as a tab or a page shows them: the form of a new task, then every
// task, open first by due date, then those done, by page. Whoever shows them
// fetches them: an event's tab, or the page of the general tasks.
const { tasks, count, page, loading = false, error = null, event, pageLocation, empty } = defineProps<{
  tasks: readonly TaskOut[]
  /** How many tasks there are in all, every page together. */
  count: number
  page: number
  loading?: boolean
  error?: Error | null
  /** The event a new task is on, or none for a general task. */
  event: number | null
  pageLocation: (page: number) => RouteLocationRaw
  /** What the list says when it holds no task. */
  empty: string
}>()

const emit = defineEmits<{ changed: [], retry: [] }>()

const { createTask } = useTaskWrites()

const pageCount = computed(() => Math.ceil(count / TASKS_PAGE_SIZE))

function add(fields: TaskFields): Promise<FormErrors | null> {
  return createTask(taskPayload(fields, false))
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-5">
    <UiCard title="Nouvelle tâche">
      <TasksForm
        :initial="taskFields(null, event)"
        action="Ajouter la tâche"
        :save="add"
        @saved="emit('changed')"
      />
    </UiCard>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="emit('retry')"
    />
    <template v-else>
      <UiCard
        flush
        :aria-busy="loading || undefined"
      >
        <ul
          v-if="tasks.length > 0"
          class="divide-y divide-argent-100"
        >
          <li
            v-for="task in tasks"
            :key="task.id"
          >
            <TasksRow
              :task
              @changed="emit('changed')"
            />
          </li>
        </ul>
        <UiEmptyState
          v-else-if="!loading"
        >
          {{ empty }}
        </UiEmptyState>
      </UiCard>
      <UiPagination
        :page
        :page-count
        :to="pageLocation"
      />
    </template>
  </div>
</template>
