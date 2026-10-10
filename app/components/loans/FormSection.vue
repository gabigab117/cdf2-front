<script setup lang="ts">
// A numbered section of the loan form: 1 Emprunteur, 2 Dates, 3 Matériel.
const { number, title, flush = false } = defineProps<{
  number: number
  title: string
  /** Its content runs to the edges, as the lines of the equipment. */
  flush?: boolean
}>()

const headingId = useId()
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="flex flex-col gap-4 overflow-hidden rounded-card border border-argent-200 bg-white"
    :class="flush ? 'pt-5.5' : 'p-5.5'"
  >
    <div
      class="flex flex-wrap items-center justify-between gap-2.5"
      :class="{ 'px-5.5': flush }"
    >
      <h2
        :id="headingId"
        class="flex items-center gap-2.5 text-title font-semibold"
      >
        <span
          class="inline-flex size-6.5 items-center justify-center rounded-full bg-sable-950 text-label text-white"
          aria-hidden="true"
        >{{ number }}</span>
        {{ title }}
      </h2>
      <slot name="aside" />
    </div>
    <slot />
  </section>
</template>
