<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { TaskFields } from '~/utils/tasks'

type EventOut = components['schemas']['EventOut']

// The « Tâches » tab of an event: the form of a new task, then every task,
// open first by due date, then those done, by page.
const { event, page } = defineProps<{
  event: EventOut
  /** The page of the tasks the address asks for. */
  page: number
}>()

const { data, status, error, refresh } = useEventTasks(event.id, () => page)
const { createTask } = useTaskWrites()

const tasks = computed(() => data.value?.items ?? [])
const pageCount = computed(() => Math.ceil((data.value?.count ?? 0) / TASKS_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')

function add(fields: TaskFields): Promise<FormErrors | null> {
  return createTask(taskPayload(fields, false))
}

// A write changes the tasks, and the count of their tab.
async function changed(): Promise<void> {
  await Promise.all([refresh(), refreshEventDashboard(event.id)])
}

function pageLocation(target: number) {
  return { query: eventPageQuery({ tab: 'tasks', page: target }) }
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-5">
    <UiCard title="Nouvelle tâche">
      <TasksForm
        :initial="taskFields(null, event.id)"
        action="Ajouter la tâche"
        :save="add"
        @saved="changed"
      />
    </UiCard>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
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
              @changed="changed"
            />
          </li>
        </ul>
        <p
          v-else-if="!loading"
          class="px-5.5 py-8 text-center text-argent-600"
        >
          Aucune tâche pour cet événement.
        </p>
      </UiCard>
      <UiPagination
        :page
        :page-count
        :to="pageLocation"
      />
    </template>
  </div>
</template>
