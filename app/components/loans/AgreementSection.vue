<script setup lang="ts">
// A part of the loan agreement under its band, « ■ Le prêteur », as the v1
// printed it. The browser prints no background: printed, the band becomes two
// rules around its title.
defineProps<{ title: string }>()
</script>

<template>
  <section class="flex flex-col gap-1">
    <h2 class="mt-1 bg-sable-950 px-2 py-0.5 text-label font-bold text-white uppercase print:border-y-2 print:border-sable-950 print:bg-transparent print:px-0 print:text-sable-950">
      <span aria-hidden="true">■ </span>{{ title }}
    </h2>
    <slot />
  </section>
</template>
