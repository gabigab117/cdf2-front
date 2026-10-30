<script setup lang="ts">
import { ArrowRight, Clock, MapPin } from '@lucide/vue'
import type { components } from '~/types/api'

const { event } = defineProps<{ event: components['schemas']['PublicEventItemOut'] }>()

const { longDay, time, schedule, countdown, countdownText } = useDateFormat()
const now = useNow()

const countdownPill = computed(() => countdownText(countdown(event, now.value), 'short'))
const day = computed(() => longDay(event.starts_at, { sentence: true }))
const shortDay = computed(() => longDay(event.starts_at, { weekday: 'short', sentence: true }))
const price = computed(() => [event.price_label, event.price_detail].filter(Boolean))
const priceLine = computed(() => price.value.join(' · '))
// On a phone, the venue and the price share a line: « Salle des fêtes · Gratuit, Goûter… ».
const venueAndPrice = computed(() => [event.venue_name, price.value.join(', ')].filter(Boolean).join(' · '))

// With a cover, the pills lie on the photo, white.
const classes = {
  pillsOnPhoto: 'absolute inset-x-5 top-5 md:inset-x-6 md:top-6',
}
const pills = computed(() => (event.cover ? classes.pillsOnPhoto : undefined))
const pillTone = computed(() => (event.cover ? 'light' : 'neutral'))
</script>

<!-- « Prochain rendez-vous », its cover on top while the site may show it (D17):
its pills then lie on the photo. -->
<template>
  <article class="relative w-full max-w-117.5 rounded-panel bg-white p-2 shadow-spotlight md:rounded-hero md:p-2.5">
    <div
      v-if="event.cover"
      class="h-47.5 overflow-hidden rounded-banner bg-sable-900 md:h-67.5 md:rounded-tile"
    >
      <SitePhoto
        :photo="event.cover"
        rendition="display"
      />
    </div>
    <div class="flex flex-col gap-2.5 px-3 pt-4.5 pb-2.5 md:gap-3.5 md:px-4 md:pt-5.5 md:pb-3.5">
      <p
        class="flex items-center justify-between gap-3"
        :class="pills"
      >
        <UiStatusPill
          :tone="pillTone"
          size="lg"
        >
          Prochain rendez-vous
        </UiStatusPill>
        <UiStatusPill
          tone="accent"
          size="lg"
          class="font-mono"
        >
          {{ countdownPill }}
        </UiStatusPill>
      </p>
      <p class="text-caption font-semibold tracking-eyebrow text-azur-600 uppercase md:text-label">
        <span class="md:hidden">{{ shortDay }}</span>
        <span class="hidden md:inline">{{ day }}</span>
        · {{ time(event.starts_at) }}
      </p>
      <h2 class="font-display text-headline font-bold md:text-kpi">
        {{ event.title }}
      </h2>
      <p class="text-ui text-sable-600 md:hidden">
        {{ venueAndPrice }}
      </p>
      <p class="hidden flex-wrap gap-x-4.5 gap-y-2 text-ui text-sable-600 md:flex">
        <span class="inline-flex items-center gap-1.5">
          <MapPin :size="16" />
          {{ event.venue_name }}
        </span>
        <span class="inline-flex items-center gap-1.5">
          <Clock :size="16" />
          {{ schedule(event) }}
        </span>
        <span v-if="priceLine">{{ priceLine }}</span>
      </p>
      <NuxtLink
        :to="publicEventPath(event.slug)"
        class="mt-1.5 flex h-13 items-center justify-between rounded-search bg-sable-950 pr-1.5 pl-4.5 text-body font-semibold text-white transition-colors hover:bg-sable-800 md:h-13.5 md:pr-2 md:pl-5"
      >
        <span class="md:hidden">Programme et infos</span>
        <span class="hidden md:inline">Programme et infos pratiques</span>
        <span class="inline-flex size-10 items-center justify-center rounded-field bg-azur-600">
          <ArrowRight :size="18" />
        </span>
      </NuxtLink>
    </div>
  </article>
</template>
