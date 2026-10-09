<script setup lang="ts">
const { pressed, size = 'md', count } = defineProps<{
  /** Whether the filter applies: the parent decides, the chip shows it. */
  pressed: boolean
  /** 40 or 34 px high. */
  size?: 'sm' | 'md'
  /** How many items the filter keeps. */
  count?: number
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
</script>

<template>
  <button
    type="button"
    :aria-pressed="pressed"
    :class="chipClasses"
  >
    <slot />
    <span
      v-if="count !== undefined"
      class="font-mono text-xs opacity-75"
    >{{ count }}</span>
  </button>
</template>
