<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type TaskOut = components['schemas']['TaskOut']

// A block of tasks: how far they have gone, the next three, then the last two
// done, struck through, as in the mockup. Whoever shows it gives its figures:
// an event's dashboard, or the board's for the general tasks.
const { title, done, total, tasks, all, allLabel } = defineProps<{
  title: string
  done: number
  total: number
  /** The next tasks, then the last ones done. */
  tasks: readonly TaskOut[]
  /** The page of all of them. */
  all: RouteLocationRaw
  allLabel: string
}>()

const emit = defineEmits<{ changed: [] }>()
</script>

<template>
  <section class="overflow-hidden rounded-tile border border-argent-200 bg-white">
    <header class="flex flex-col gap-2.5 border-b border-argent-100 px-5 py-4.5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-semibold">
          {{ title }}
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
