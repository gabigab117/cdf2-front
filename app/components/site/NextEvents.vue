<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { components } from '~/types/api'

const { events } = defineProps<{ events: Array<components['schemas']['PublicEventItemOut']> }>()

const { dayParts, schedule } = useDateFormat()

// The tiles of the days take turns, black then azur, as in the mockup.
const TILES = [
  { tile: 'bg-sable-950', month: 'text-argent-400' },
  { tile: 'bg-azur-600', month: 'text-azur-150' },
]

const cards = computed(() =>
  events.map((event, index) => ({ event, day: dayParts(event.starts_at), colours: TILES[index % TILES.length] })),
)
</script>

<!-- « Ensuite au programme »: the events that come next in the agenda. -->
<template>
  <section
    aria-labelledby="next-events"
    class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-14 pb-20 md:px-6 md:pt-18 md:pb-24"
  >
    <SiteBlockTitle id="next-events">
      Ensuite au programme
    </SiteBlockTitle>
    <ul class="grid gap-4 md:grid-cols-2">
      <li
        v-for="{ event, day, colours } in cards"
        :key="event.slug"
      >
        <NuxtLink
          :to="publicEventPath(event.slug)"
          class="flex items-center gap-5 rounded-panel border border-argent-200 bg-white p-5 text-sable-950 transition-colors hover:bg-argent-25"
        >
          <span
            class="flex size-21 shrink-0 flex-col items-center justify-center rounded-banner text-white"
            :class="colours?.tile"
          >
            <span class="font-display text-kpi font-bold">{{ day.day }}</span>
            <span
              class="mt-1 text-overline font-semibold uppercase"
              :class="colours?.month"
            >{{ day.month }}</span>
          </span>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <h3 class="font-display text-2xl font-strong tracking-tight">
              {{ event.title }}
            </h3>
            <span class="text-ui text-argent-600">{{ event.venue_name }} · {{ schedule(event) }}</span>
          </div>
          <ArrowRight
            :size="20"
            class="shrink-0"
            aria-hidden="true"
          />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
