<script setup lang="ts">
// A line of the loan agreement: its label, then what the loan fills in, or a
// dotted line to fill in by hand.
const { label, value = '', short = false } = defineProps<{
  label: string
  value?: string
  /** A narrow line, such as a postcode or an amount. */
  short?: boolean
}>()

const classes = {
  field: { fill: 'flex-1', short: 'flex-none' },
  line: { fill: 'flex-1', short: 'w-24' },
}

const size = computed(() => (short ? 'short' : 'fill'))
</script>

<template>
  <div
    class="flex min-w-0 items-baseline gap-2 text-caption"
    :class="classes.field[size]"
  >
    <span class="font-bold whitespace-nowrap">{{ label }}&nbsp;:</span>
    <span
      class="min-h-4 border-b border-dotted border-sable-950 px-1"
      :class="[classes.line[size], { 'font-semibold': value }]"
    >{{ value }}</span>
  </div>
</template>
