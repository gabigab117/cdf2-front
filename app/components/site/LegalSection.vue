<script setup lang="ts">
const { title } = defineProps<{ title: string }>()

const titleId = useId()
</script>

<!-- A section of a legal page: « Éditeur », « Vos droits »… -->
<template>
  <section
    :aria-labelledby="titleId"
    class="flex flex-col gap-4"
  >
    <h2
      :id="titleId"
      class="font-display text-headline font-bold text-sable-950"
    >
      {{ title }}
    </h2>
    <slot />
  </section>
</template>
