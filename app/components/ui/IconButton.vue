<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const { label, size = 'md', surface = 'light', to } = defineProps<{
  /** What the button does: an icon alone says nothing to a screen reader. */
  label: string
  /** 44 or 36 px square. */
  size?: 'sm' | 'md'
  /**
   * What the button stands on: the board's sidebar is dark; the toolbar of the
   * notes' input zone keeps a plain button, without a frame.
   */
  surface?: 'light' | 'dark' | 'plain'
  /** A page of the board: the button becomes a link to it, as a way back. */
  to?: RouteLocationRaw
}>()

const classes = {
  base: 'inline-flex shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed',
  size: {
    sm: 'size-9 rounded-control',
    md: 'size-11 rounded-field',
  },
  surface: {
    light: 'border border-argent-200 bg-white text-sable-950 hover:bg-argent-25 disabled:text-argent-300 disabled:hover:bg-white',
    dark: 'text-argent-450 hover:bg-sable-800 hover:text-white',
    plain: 'text-argent-600 hover:bg-argent-100 hover:text-sable-950',
  },
}

const buttonClasses = computed(() => [classes.base, classes.size[size], classes.surface[surface]])
</script>

<template>
  <NuxtLink
    v-if="to"
    :to
    :aria-label="label"
    :class="buttonClasses"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    type="button"
    :aria-label="label"
    :class="buttonClasses"
  >
    <slot />
  </button>
</template>
