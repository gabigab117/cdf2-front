<script setup lang="ts">
// The « Tâches » block beside the notes: how far the event's tasks have gone,
// the next three, then the last two done, struck through, as in the mockup.
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
  <section
    v-if="dashboard && !error"
    class="overflow-hidden rounded-tile border border-argent-200 bg-white"
  >
    <header class="flex flex-col gap-2.5 border-b border-argent-100 px-5 py-4.5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-semibold">
          Tâches
        </h2>
        <span class="font-mono text-label text-sable-600">{{ done }} / {{ total }}</span>
      </div>
      <UiProgressBar
        :value="done"
        :max="total"
        label="Tâches faites"
      />
    </header>
    <ul
      v-if="tasks.length > 0"
      class="py-1.5"
    >
      <li
        v-for="task in tasks"
        :key="task.id"
        class="px-5 py-2.5"
      >
        <TasksItem
          :task
          @changed="changed"
        />
      </li>
    </ul>
    <p
      v-else
      class="px-5 py-4 text-sm text-argent-600"
    >
      Aucune tâche pour l’instant.
    </p>
    <div class="border-t border-argent-100 px-5 py-3">
      <UiButton
        variant="link"
        :to="allTasks"
      >
        {{ allTasksLabel }}
      </UiButton>
    </div>
  </section>
</template>
