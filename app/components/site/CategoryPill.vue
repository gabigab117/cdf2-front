<script setup lang="ts">
import type { components } from '~/types/api'

type EventCategory = components['schemas']['EventCategory']

const { category, size = 'md' } = defineProps<{
  category: EventCategory
  /** 26 or 28 px high. */
  size?: 'md' | 'lg'
}>()

// The colours of the agenda's categories: the mockup's, and solid azur for the
// festivities, which it does not draw (A10).
const TONES = {
  children: 'azur',
  meals: 'neutral',
  markets: 'ambre',
  games: 'steel',
  festivities: 'accent',
} as const satisfies Record<EventCategory, string>
</script>

<template>
  <UiStatusPill
    :tone="TONES[category]"
    :size
  >
    {{ EVENT_CATEGORIES[category] }}
  </UiStatusPill>
</template>
