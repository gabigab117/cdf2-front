<script setup lang="ts">
import type { components } from '~/types/api'

const { event } = defineProps<{ event: components['schemas']['EventItemOut'] }>()

const { eventWhen } = useDateFormat()

const details = computed(() => `${eventWhen(event)} · ${event.venue_name}`)
const category = computed(() => EVENT_CATEGORIES[event.category])
</script>

<template>
  <NuxtLink
    :to="eventPath(event.id)"
    class="flex flex-col gap-3 px-5.5 py-4 transition-colors hover:bg-argent-25 md:flex-row md:items-center md:gap-4"
  >
    <span class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="font-semibold">{{ event.title }}</span>
      <span class="text-note text-argent-600">{{ details }}</span>
    </span>
    <span class="flex shrink-0 flex-wrap items-center gap-2">
      <UiStatusPill tone="outline">{{ category }}</UiStatusPill>
      <EventsPublicationPill :published="event.published" />
    </span>
  </NuxtLink>
</template>
