<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type GeneralTasksOut = components['schemas']['GeneralTasksOut']

// The « Tâches » block: how far the tasks have gone, the next three, then the
// last two done, struck through, as in the mockup. Whoever shows it gives its
// figures: an event's dashboard, or the board's for the general tasks.
const { title, figures, all } = defineProps<{
  title: string
  figures: Pick<GeneralTasksOut, 'next_tasks' | 'recently_done_tasks' | 'tasks_done' | 'tasks_total'>
  /** The page of all of them. */
  all: RouteLocationRaw
}>()

const emit = defineEmits<{ changed: [] }>()

const tasks = computed(() => [...figures.next_tasks, ...figures.recently_done_tasks])
const allLabel = computed(() => (figures.tasks_total > 0 ? `Voir les ${figures.tasks_total} tâches` : 'Ajouter une tâche'))
</script>

<template>
  <section class="overflow-hidden rounded-tile border border-argent-200 bg-white">
    <header class="flex flex-col gap-2.5 border-b border-argent-100 px-5 py-4.5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-semibold">
          {{ title }}
        </h2>
        <span class="font-mono text-label text-sable-600">{{ figures.tasks_done }} / {{ figures.tasks_total }}</span>
      </div>
      <UiProgressBar
        :value="figures.tasks_done"
        :max="figures.tasks_total"
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
          @changed="emit('changed')"
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
        :to="all"
      >
        {{ allLabel }}
      </UiButton>
    </div>
  </section>
</template>
