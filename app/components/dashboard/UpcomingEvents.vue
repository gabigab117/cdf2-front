<script setup lang="ts">
import { Plus } from '@lucide/vue'
import type { components } from '~/types/api'

const { events, count, loading = false } = defineProps<{
  /** The next events, the closest first. */
  events: components['schemas']['EventItemOut'][]
  /** How many events are to come in all: beyond those shown, the table leads to the list. */
  count: number
  /** The events are on their way: the table says nothing of them yet. */
  loading?: boolean
}>()

const { day } = useDateFormat()

const classes = {
  // The next event stands out, as in the mockup, on the white of the card.
  dot: {
    next: 'bg-azur-600',
    later: 'bg-argent-400',
  },
  row: 'grid grid-cols-upcoming items-center gap-4 px-5.5',
}

const rows = computed(() =>
  events.map((event, index) => ({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    date: day(event.starts_at),
    path: eventPath(event.id),
    dot: index === 0 ? classes.dot.next : classes.dot.later,
  })),
)

const more = computed(() => count > events.length)
</script>

<template>
  <UiCard
    flush
    title="Événements à venir"
    :aria-busy="loading || undefined"
  >
    <template #actions>
      <UiButton
        variant="link"
        :to="NEW_EVENT_PATH"
      >
        <Plus :size="16" />
        Créer un événement
      </UiButton>
    </template>
    <template v-if="rows.length > 0">
      <div
        aria-hidden="true"
        class="border-b border-argent-100 bg-argent-25 py-2.5 text-caption font-semibold tracking-table text-argent-600 uppercase"
        :class="classes.row"
      >
        <span>Événement</span>
        <span>Date</span>
      </div>
      <ul class="divide-y divide-argent-100">
        <li
          v-for="row in rows"
          :key="row.id"
        >
          <NuxtLink
            :to="row.path"
            class="py-4 transition-colors hover:bg-argent-25"
            :class="classes.row"
          >
            <span class="flex min-w-0 items-center gap-2.5 font-semibold">
              <span
                aria-hidden="true"
                class="size-2 shrink-0 rounded-full"
                :class="row.dot"
              />
              <span class="truncate">{{ row.title }}</span>
            </span>
            <time
              :datetime="row.startsAt"
              class="text-sable-600"
            >{{ row.date }}</time>
          </NuxtLink>
        </li>
      </ul>
      <p
        v-if="more"
        class="border-t border-argent-100 px-5.5 py-3.5 text-sm"
      >
        <NuxtLink
          :to="EVENTS_PATH"
          class="font-medium text-azur-600 hover:text-azur-700"
        >
          Voir les {{ count }} événements à venir
        </NuxtLink>
      </p>
    </template>
    <p
      v-else-if="!loading"
      class="px-5.5 py-8 text-center text-argent-600"
    >
      Aucun événement à venir.
    </p>
  </UiCard>
</template>
