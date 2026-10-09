<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const {
  variant = 'primary',
  size = 'md',
  type = 'button',
  to,
  block = false,
  loading = false,
  disabled = false,
} = defineProps<{
  /**
   * Black for the main action, azur for a validation, bordered or plain text
   * for the others, dashed to add a line to a list.
   */
  variant?: 'primary' | 'accent' | 'secondary' | 'link' | 'dashed'
  /** 38, 44 or 48 px high. Plain text has no height of its own. */
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  /** A page of the site: the button becomes a link to it. */
  to?: RouteLocationRaw
  /** Takes the whole width of its container. */
  block?: boolean
  /** An action under way: the button waits, unavailable. */
  loading?: boolean
  disabled?: boolean
}>()

const classes = {
  base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:cursor-not-allowed',
  variant: {
    primary: 'bg-sable-950 text-white hover:bg-sable-800 disabled:bg-argent-200 disabled:text-argent-600',
    accent: 'bg-azur-600 text-white hover:bg-azur-700 disabled:bg-argent-200 disabled:text-argent-600',
    secondary: 'border border-argent-250 bg-white text-sable-950 hover:bg-argent-25 disabled:text-argent-400',
    link: 'text-sm font-medium text-azur-600 hover:text-azur-700 disabled:text-argent-400',
    dashed: 'border border-dashed border-argent-300 bg-white text-sable-600 hover:bg-argent-25 disabled:text-argent-400',
  },
  size: {
    sm: 'h-9.5 rounded-control px-3.5 text-note font-medium',
    md: 'h-11 rounded-field px-4 text-ui font-medium',
    lg: 'h-12 rounded-search px-5 text-body font-semibold',
  },
  block: 'w-full',
}

const buttonClasses = computed(() => [
  classes.base,
  classes.variant[variant],
  variant !== 'link' && classes.size[size],
  block && classes.block,
])
</script>

<template>
  <NuxtLink
    v-if="to"
    :to
    :class="buttonClasses"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :class="buttonClasses"
  >
    <slot />
  </button>
</template>
