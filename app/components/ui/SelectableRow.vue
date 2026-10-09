<script setup lang="ts">
const { selected } = defineProps<{
  /** The row whose detail shows beside the list. */
  selected: boolean
}>()

// The columns are the list's own: it lays them out on the row.
const classes = {
  base: 'block w-full text-left transition-colors',
  selected: 'bg-azur-50 shadow-selected',
  idle: 'bg-white hover:bg-argent-25',
}

const rowClasses = computed(() => [classes.base, selected ? classes.selected : classes.idle])
</script>

<template>
  <button
    type="button"
    :aria-pressed="selected"
    :class="rowClasses"
  >
    <slot />
  </button>
</template>
