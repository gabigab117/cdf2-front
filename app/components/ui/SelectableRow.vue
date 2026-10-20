<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const { selected, to } = defineProps<{
  /** The row whose detail shows beside the list. */
  selected: boolean
  /** The address of the row's detail, which keeps the row shown. */
  to: RouteLocationRaw
}>()

// The columns are the list's own: it lays them out on the row.
const classes = {
  base: 'block w-full text-left transition-colors',
  selected: 'bg-azur-50 shadow-selected',
  idle: 'bg-white hover:bg-argent-25',
}

const rowClasses = computed(() => [classes.base, selected ? classes.selected : classes.idle])

// The link says it is the current item of the list. The router would mark every
// row of the page as such, whatever its query: the row decides alone.
const current = computed(() => (selected ? 'true' : undefined))
</script>

<template>
  <NuxtLink
    :to
    :aria-current="current"
    :class="rowClasses"
  >
    <slot />
  </NuxtLink>
</template>
