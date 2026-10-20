<script setup lang="ts">
const { label } = defineProps<{
  /** « Siège », « Téléphone »… */
  label: string
}>()
</script>

<!-- A detail of a legal page, within its list: the label, then the value. -->
<template>
  <div class="flex flex-col gap-0.5">
    <UiOverline as="dt">
      {{ label }}
    </UiOverline>
    <dd class="text-sable-950">
      <slot />
    </dd>
  </div>
</template>
