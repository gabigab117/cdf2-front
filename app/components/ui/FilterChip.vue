<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { NuxtLink } from '#components'

const { pressed, size = 'md', count, to } = defineProps<{
  /** Whether the filter applies: the parent decides, the chip shows it. */
  pressed: boolean
  /** 40 or 34 px high. */
  size?: 'sm' | 'md'
  /** How many items the filter keeps. */
  count?: number
  /**
   * The address of the filtered list: the chip becomes a link, which filters
   * without JavaScript. It is the current page when its filter applies.
   */
  to?: RouteLocationRaw
}>()

const classes = {
  base: 'inline-flex shrink-0 items-center rounded-full border font-medium transition-colors',
  size: {
    sm: 'h-8.5 gap-1.5 px-3 text-note',
    md: 'h-10 gap-2 px-3.5 text-sm',
  },
  pressed: 'border-sable-950 bg-sable-950 text-white',
  released: 'border-argent-250 bg-white text-sable-950 hover:bg-argent-25',
}

const chipClasses = computed(() => [classes.base, classes.size[size], pressed ? classes.pressed : classes.released])

// A button says it is pressed; a link says it is the current page. The router
// would mark every chip of the page as such, whatever its query: the chip
// decides alone.
const state = computed(() =>
  to ? { 'aria-current': pressed ? 'page' : undefined } : { 'type': 'button', 'aria-pressed': pressed },
)
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to
    v-bind="state"
    :class="chipClasses"
  >
    <slot />
    <span
      v-if="count !== undefined"
      class="font-mono text-xs opacity-75"
    >{{ count }}</span>
  </component>
</template>
