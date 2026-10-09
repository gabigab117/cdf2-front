<script setup lang="ts">
const { title, flush = false } = defineProps<{
  title?: string
  /** The content runs to the card's edges, as the rows of a list do. */
  flush?: boolean
}>()
</script>

<template>
  <section class="overflow-hidden rounded-card border border-argent-200 bg-white">
    <header
      v-if="title || $slots.actions"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-argent-100 px-5.5 py-4.5"
    >
      <h2
        v-if="title"
        class="text-title font-semibold"
      >
        {{ title }}
      </h2>
      <slot name="actions" />
    </header>
    <slot v-if="flush" />
    <div
      v-else
      class="flex flex-col gap-4.5 p-5.5"
    >
      <slot />
    </div>
  </section>
</template>
