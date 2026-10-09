<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const { items } = defineProps<{
  /** From the widest section to the current page, the only one without a link. */
  items: ReadonlyArray<{ label: string, to?: RouteLocationRaw }>
}>()
</script>

<template>
  <nav aria-label="Fil d’Ariane">
    <ol class="flex min-w-0 items-center gap-2 text-sm text-argent-600">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="flex min-w-0 items-center gap-2"
      >
        <span
          v-if="index > 0"
          aria-hidden="true"
        >/</span>
        <NuxtLink
          v-if="item.to"
          :to="item.to"
          class="font-medium whitespace-nowrap text-sable-600 transition-colors hover:text-sable-950"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          aria-current="page"
          class="truncate"
        >{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
