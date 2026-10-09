<script setup lang="ts">
import type { components } from '~/types/api'

const { event } = defineProps<{ event: components['schemas']['PublicEventOut'] }>()

const { day, dayParts, countdown, countdownText } = useDateFormat()
const now = useNow()

const weekday = computed(() => dayParts(event.starts_at).longWeekday)
const left = computed(() => countdownText(countdown(event, now.value), 'long'))
</script>

<template>
  <p class="flex shrink-0 flex-col items-start gap-1 rounded-panel bg-sable-950 px-6 py-5 text-white">
    <span class="text-caption font-semibold tracking-overline text-argent-400 uppercase">{{ weekday }}</span>
    <span class="font-display text-date font-bold">{{ day(event.starts_at, { weekday: false }) }}</span>
    <span class="mt-1.5 inline-flex items-center gap-2 text-sm text-argent-350">
      <span
        class="size-2 rounded-full bg-azur-400"
        aria-hidden="true"
      />
      {{ left }}
    </span>
  </p>
</template>
