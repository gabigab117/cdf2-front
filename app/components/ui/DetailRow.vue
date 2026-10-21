<script setup lang="ts">
// A row of a list of details (<dl>): its label, then its figure, in mono; the
// last row of the list has no rule under it.
const { label, value } = defineProps<{ label: string, value: string }>()
</script>

<template>
  <div class="flex justify-between gap-4 border-b border-argent-100 py-2.5 text-ui last:border-b-0">
    <dt class="text-argent-600">
      {{ label }}
    </dt>
    <dd class="font-mono font-medium">
      {{ value }}
    </dd>
  </div>
</template>
