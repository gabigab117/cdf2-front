<script setup lang="ts">
const { title } = defineProps<{
  /** « Mentions légales », « Données personnelles ». */
  title: string
}>()

const breadcrumb = computed(() => [{ label: 'Accueil', to: '/' }, { label: title }])
</script>

<!-- A legal page of the site: its way home, its title, then its sections in a reading column. -->
<template>
  <article class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-6 pb-16 md:gap-10 md:px-6 md:pt-10 md:pb-24">
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <h1 class="font-display text-section font-heavy text-balance">
      {{ title }}
    </h1>
    <div class="flex max-w-3xl flex-col gap-10 text-base leading-relaxed text-sable-600 md:gap-12">
      <slot />
    </div>
  </article>
</template>
