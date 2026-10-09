<script setup lang="ts">
const { value, max, label, tone = 'azur', surface = 'light', size = 'sm' } = defineProps<{
  /** How far along: 9 tasks done… */
  value: number
  /** …out of 14. */
  max: number
  /** What progresses, for screen readers. */
  label: string
  /** Amber when the level calls for attention. */
  tone?: 'azur' | 'ambre'
  /** What the bar stands on: the black KPI card is dark. */
  surface?: 'light' | 'dark'
  /** 6 or 8 px high. */
  size?: 'sm' | 'md'
}>()

// A bar never runs past its track, nor below it.
const reached = computed(() => Math.min(Math.max(value, 0), max))
const width = computed(() => `${max > 0 ? (reached.value / max) * 100 : 0}%`)

const classes = {
  size: {
    sm: 'h-1.5',
    md: 'h-2',
  },
  track: {
    light: 'bg-argent-100',
    dark: 'bg-sable-700',
  },
  fill: {
    light: { azur: 'bg-azur-600', ambre: 'bg-ambre-500' },
    dark: { azur: 'bg-azur-400', ambre: 'bg-ambre-400' },
  },
}
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="reached"
    class="overflow-hidden rounded-full"
    :class="[classes.size[size], classes.track[surface]]"
  >
    <div
      class="h-full rounded-full"
      :class="classes.fill[surface][tone]"
      :style="{ width }"
    />
  </div>
</template>
