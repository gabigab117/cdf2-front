<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const { page, pageCount, to } = defineProps<{
  /** The page shown, from 1. */
  page: number
  pageCount: number
  /** The address of a page of the list. */
  to: (page: number) => RouteLocationRaw
}>()

const previous = computed(() => (page > 1 ? to(page - 1) : undefined))
const next = computed(() => (page < pageCount ? to(page + 1) : undefined))
</script>

<template>
  <nav
    v-if="pageCount > 1"
    aria-label="Pagination"
    class="flex items-center justify-between gap-3"
  >
    <UiButton
      variant="secondary"
      size="sm"
      :to="previous"
      :disabled="!previous"
    >
      Précédent
    </UiButton>
    <span class="text-note text-argent-600">Page {{ page }} sur {{ pageCount }}</span>
    <UiButton
      variant="secondary"
      size="sm"
      :to="next"
      :disabled="!next"
    >
      Suivant
    </UiButton>
  </nav>
</template>
