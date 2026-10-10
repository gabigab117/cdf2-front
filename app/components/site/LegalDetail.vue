<script setup lang="ts">
const { label } = defineProps<{
  /** « Siège », « Téléphone »… */
  label: string
}>()
</script>

<!-- A detail of a legal page, within its list: the label, then the value. -->
<template>
  <div class="flex flex-col gap-0.5">
    <dt class="text-caption font-semibold tracking-overline text-argent-600 uppercase">
      {{ label }}
    </dt>
    <dd class="text-sable-950">
      <slot />
    </dd>
  </div>
</template>
