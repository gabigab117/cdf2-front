<script setup lang="ts">
import type { components } from '~/types/api'

type GeneralTasksOut = components['schemas']['GeneralTasksOut']

// The « Tâches générales » block of the dashboard: the tasks without an event
// (D10), the next three, then the last two done.
const { summary } = defineProps<{ summary: GeneralTasksOut }>()

const emit = defineEmits<{ changed: [] }>()
</script>

<template>
  <TasksBlock
    title="Tâches générales"
    :figures="summary"
    :all="GENERAL_TASKS_PATH"
    @changed="emit('changed')"
  />
</template>
