<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// One kind of item in the « À traiter » panel: its title, the items that lead
// where each is dealt with, and what follows them when the panel lists only
// the first.
const { id, title, items, more = null } = defineProps<{
  id: string
  title: string
  items: ReadonlyArray<{ key: number, to: RouteLocationRaw, title: string, line: string }>
  /** « Voir les 12 documents à vérifier »: a link, or a mere line without one. */
  more?: { label: string, to?: RouteLocationRaw } | null
}>()
</script>

<template>
  <section
    :aria-labelledby="id"
    class="flex flex-col"
  >
    <h3
      :id
      class="px-3 pt-1 pb-1.5 text-overline font-semibold text-argent-600 uppercase"
    >
      {{ title }}
    </h3>
    <ul class="flex flex-col">
      <li
        v-for="item in items"
        :key="item.key"
      >
        <NuxtLink
          :to="item.to"
          class="flex flex-col gap-0.5 rounded-field px-3 py-2 transition-colors hover:bg-argent-100"
        >
          <span class="truncate text-ui font-medium text-sable-950">{{ item.title }}</span>
          <span class="text-label text-argent-600">{{ item.line }}</span>
        </NuxtLink>
      </li>
    </ul>
    <template v-if="more">
      <UiButton
        v-if="more.to"
        variant="link"
        class="mx-3 my-2 self-start"
        :to="more.to"
      >
        {{ more.label }}
      </UiButton>
      <p
        v-else
        class="px-3 py-2 text-label text-argent-600"
      >
        {{ more.label }}
      </p>
    </template>
  </section>
</template>
