<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const { page, pageCount, to } = defineProps<{
  /** The page shown, from 1. */
  page: number
  pageCount: number
  /** The address of a page of the list. */
  to: (page: number) => RouteLocationRaw
}>()
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
      :to="page > 1 ? to(page - 1) : undefined"
      :disabled="page <= 1"
    >
      Précédent
    </UiButton>
    <span class="text-note text-argent-600">Page {{ page }} sur {{ pageCount }}</span>
    <UiButton
      variant="secondary"
      size="sm"
      :to="page < pageCount ? to(page + 1) : undefined"
      :disabled="page >= pageCount"
    >
      Suivant
    </UiButton>
  </nav>
</template>
