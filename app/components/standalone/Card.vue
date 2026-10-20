<script setup lang="ts">
// The card of a page on its own (layouts/standalone.vue): the sign-in, the
// choice of a password, the error page.
const { overline, title, tone = 'argent' } = defineProps<{
  /** The line above the title: « Espace bureau », « Erreur 404 ». */
  overline: string
  title: string
  /** The colour of that line: azur on the error page. */
  tone?: 'argent' | 'azur'
}>()

const classes = {
  overline: {
    argent: 'text-argent-600',
    azur: 'text-azur-600',
  },
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-6 rounded-card border border-argent-200 bg-white p-6 md:p-8">
    <div class="flex flex-col gap-2">
      <p
        class="text-overline font-semibold uppercase"
        :class="classes.overline[tone]"
      >
        {{ overline }}
      </p>
      <h1 class="font-display text-headline font-bold">
        {{ title }}
      </h1>
      <slot name="lead" />
    </div>
    <slot />
  </div>
</template>
