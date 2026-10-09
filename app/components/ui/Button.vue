<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const {
  variant = 'primary',
  size = 'md',
  type = 'button',
  to,
  external = false,
  block = false,
  loading = false,
  disabled = false,
} = defineProps<{
  /**
   * Black for the main action, azur for a validation, bordered or plain text
   * for the others, dashed to add a line to a list, white on a dark surface.
   */
  variant?: 'primary' | 'accent' | 'secondary' | 'link' | 'dashed' | 'inverse'
  /**
   * 38, 44 or 48 px high, or 52 px and round for the calls of the public site.
   * Plain text has no height of its own.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  type?: 'button' | 'submit'
  /** A page of the site: the button becomes a link to it. */
  to?: RouteLocationRaw
  /**
   * The link leads out of the application, to a file of the API for instance:
   * the browser loads it, the router does not.
   */
  external?: boolean
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
    inverse: 'bg-white text-sable-950 hover:bg-argent-100 disabled:text-argent-400',
  },
  size: {
    sm: 'h-9.5 rounded-control px-3.5 text-note font-medium',
    md: 'h-11 rounded-field px-4 text-ui font-medium',
    lg: 'h-12 rounded-search px-5 text-body font-semibold',
    xl: 'h-13 rounded-full px-6 text-base font-semibold',
  },
  block: 'w-full',
}

// A link drawn as a button is never the current page: the router would mark a
// link to the page shown with another query or anchor as such (aria-current).

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
    :external
    :aria-current="undefined"
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
