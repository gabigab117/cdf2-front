<script setup lang="ts">
import type { Component } from 'vue'

// An action of the top bar: its label beside its icon on a computer. Under
// 820 px, its icon alone, so that the name of the committee keeps to one line
// beside the bell; screen readers still read the label.
defineProps<{
  icon: Component
  label: string
}>()
</script>

<template>
  <UiButton class="max-md:w-11 max-md:px-0">
    <component
      :is="icon"
      :size="18"
    />
    <span class="max-md:sr-only">{{ label }}</span>
  </UiButton>
</template>
