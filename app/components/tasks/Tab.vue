<script setup lang="ts">
import type { components } from '~/types/api'

type EventOut = components['schemas']['EventOut']

// The « Tâches » tab of an event: its tasks, by page.
const { event, page } = defineProps<{
  event: EventOut
  /** The page of the tasks the address asks for. */
  page: number
}>()

const { data, status, error, refresh } = useEventTasks(event.id, () => page)

const tasks = computed(() => data.value?.items ?? [])
const count = computed(() => data.value?.count ?? 0)
const loading = computed(() => status.value === 'pending')

// A write changes the tasks, and the count of their tab.
async function changed(): Promise<void> {
  await Promise.all([refresh(), refreshEventDashboard(event.id)])
}

function pageLocation(target: number) {
  return { query: eventPageQuery({ tab: 'tasks', page: target }) }
}
</script>

<template>
  <TasksList
    :tasks
    :count
    :page
    :loading
    :error
    :event="event.id"
    :page-location="pageLocation"
    empty="Aucune tâche pour cet événement."
    @changed="changed"
    @retry="refresh()"
  />
</template>
