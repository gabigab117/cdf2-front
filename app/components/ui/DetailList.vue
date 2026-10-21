<script setup lang="ts">
// A list of details (<dl>): a row each, its label then its figure.
const { rows } = defineProps<{
  /** A row's key is its label, unless two rows share it. */
  rows: readonly { key?: string, label: string, value: string }[]
}>()
</script>

<template>
  <dl class="flex flex-col">
    <UiDetailRow
      v-for="row in rows"
      :key="row.key ?? row.label"
      :label="row.label"
      :value="row.value"
    />
  </dl>
</template>
