<script setup lang="ts">
import type { components } from '~/types/api'

type GeneralTasksOut = components['schemas']['GeneralTasksOut']

// The « Tâches générales » block of the dashboard: the tasks without an event
// (D10), the next three, then the last two done.
const { summary } = defineProps<{ summary: GeneralTasksOut }>()

const emit = defineEmits<{ changed: [] }>()

const tasks = computed(() => [...summary.next_tasks, ...summary.recently_done_tasks])
const allLabel = computed(() => (summary.tasks_total > 0 ? `Voir les ${summary.tasks_total} tâches` : 'Ajouter une tâche'))
</script>

<template>
  <TasksSummary
    title="Tâches générales"
    :done="summary.tasks_done"
    :total="summary.tasks_total"
    :tasks
    :all="GENERAL_TASKS_PATH"
    :all-label="allLabel"
    @changed="emit('changed')"
  />
</template>
