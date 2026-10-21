<script setup lang="ts">
// A row of a list of details (<dl>): its label, then the <dd> its caller
// writes, whose look varies (a figure in mono, a value to the right).
const { label } = defineProps<{ label: string }>()
</script>

<template>
  <div class="flex justify-between gap-4 border-b border-argent-100 py-2.5 text-ui">
    <dt class="text-argent-600">
      {{ label }}
    </dt>
    <slot />
  </div>
</template>
