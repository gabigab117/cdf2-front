<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { NuxtLink } from '#components'

const { selected, to } = defineProps<{
  /** The row whose detail shows beside the list. */
  selected: boolean
  /**
   * The address of the row's detail: the row becomes a link, the address
   * keeping the row shown.
   */
  to?: RouteLocationRaw
}>()

// The columns are the list's own: it lays them out on the row.
const classes = {
  base: 'block w-full text-left transition-colors',
  selected: 'bg-azur-50 shadow-selected',
  idle: 'bg-white hover:bg-argent-25',
}

const rowClasses = computed(() => [classes.base, selected ? classes.selected : classes.idle])

// A button says it is pressed; a link says it is the current item of the list.
// The router would mark every row of the page as such, whatever its query: the
// row decides alone.
const state = computed(() =>
  to ? { 'aria-current': selected ? 'true' : undefined } : { 'type': 'button', 'aria-pressed': selected },
)
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to
    v-bind="state"
    :class="rowClasses"
  >
    <slot />
  </component>
</template>
