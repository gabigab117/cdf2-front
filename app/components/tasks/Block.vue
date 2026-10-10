<script setup lang="ts">
// The « Tâches » block beside the notes of an event, from its dashboard.
const { eventId } = defineProps<{ eventId: number }>()

const { data: dashboard, error } = useEventDashboard(eventId)

const tasks = computed(() => [...(dashboard.value?.next_tasks ?? []), ...(dashboard.value?.recently_done_tasks ?? [])])
const done = computed(() => dashboard.value?.tasks_done ?? 0)
const total = computed(() => dashboard.value?.tasks_total ?? 0)
const allTasks = computed(() => ({ query: eventPageQuery({ tab: 'tasks', page: 1 }) }))
const allTasksLabel = computed(() => (total.value > 0 ? `Voir les ${total.value} tâches` : 'Ajouter une tâche'))

function changed(): Promise<void> {
  return refreshEventDashboard(eventId)
}
</script>

<template>
  <TasksSummary
    v-if="dashboard && !error"
    title="Tâches"
    :done
    :total
    :tasks
    :all="allTasks"
    :all-label="allTasksLabel"
    @changed="changed"
  />
</template>
