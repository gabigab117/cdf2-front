<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// « Exercice 2026 »: the fiscal years that have lines, and the current one. A
// choice leads to the address of that year.
const { year, years, location } = defineProps<{
  year: number
  /** The years the results offer, the latest first. */
  years: readonly number[]
  location: (year: number) => RouteLocationRaw
}>()

// A year of the address with no line is offered all the same.
const options = computed(() =>
  (years.includes(year) ? years : [year, ...years]).map(value => ({ value, label: `Exercice ${value}` })),
)
const selected = computed({
  get: () => year,
  set: (value) => { void navigateTo(location(value)) },
})
</script>

<template>
  <div class="w-40">
    <UiSelect
      v-model="selected"
      :options
      size="sm"
      aria-label="Exercice"
    />
  </div>
</template>
