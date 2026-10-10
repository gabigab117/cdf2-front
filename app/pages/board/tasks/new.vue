<script setup lang="ts">
import type { FormErrors } from '~/utils/api-errors'
import type { TaskFields } from '~/utils/tasks'

definePageMeta({ path: '/bureau/taches/nouvelle' })

useHead({ title: 'Nouvelle tâche' })

const BREADCRUMB = [{ label: 'Tableau de bord', to: BOARD_HOME_PATH }, { label: 'Nouvelle tâche' }]

// The task is created on an event to come, or on none, a general task (D10).
// The sidebar's request holds three events only: one page serves here.
const { data: upcoming } = useLazyAsyncData('board:task-events', (_nuxtApp, { signal }) =>
  loadData(useApi().GET('/api/board/events', { params: { query: { period: 'upcoming', page_size: 100 } }, signal })),
)

const { day } = useDateFormat()
const { createTask } = useTaskWrites()

const events = computed(() =>
  (upcoming.value?.items ?? []).map(event => ({ value: event.id, label: `${event.title} · ${day(event.starts_at)}` })),
)

let eventCreatedOn: number | null = null

function create(fields: TaskFields): Promise<FormErrors | null> {
  eventCreatedOn = fields.event
  return createTask(taskPayload(fields, false))
}

// The task created shows among the tasks of its event, or the general ones:
// going back leads here.
async function open(): Promise<void> {
  if (eventCreatedOn === null) await navigateTo(GENERAL_TASKS_PATH)
  else await navigateTo({ path: eventPath(eventCreatedOn), query: eventPageQuery({ tab: 'tasks', page: 1 }) })
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-6">
    <UiBreadcrumb :items="BREADCRUMB" />
    <BoardPageTitle>Nouvelle tâche</BoardPageTitle>
    <UiCard>
      <TasksForm
        :initial="taskFields(null, null)"
        :events
        action="Créer la tâche"
        :save="create"
        @saved="open"
      />
    </UiCard>
  </div>
</template>
