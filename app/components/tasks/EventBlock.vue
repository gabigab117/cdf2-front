<script setup lang="ts">
// The « Tâches » block beside the notes of an event, from its dashboard.
const { eventId } = defineProps<{ eventId: number }>()

const { data: dashboard, error } = useEventDashboard(eventId)

const allTasks = { query: eventPageQuery({ tab: 'tasks', page: 1 }) }

function changed(): Promise<void> {
  return refreshEventDashboard(eventId)
}
</script>

<template>
  <TasksBlock
    v-if="dashboard && !error"
    title="Tâches"
    :figures="dashboard"
    :all="allTasks"
    @changed="changed"
  />
</template>
