<script setup lang="ts">
import { ArrowRightLeft, Calendar, Folder, Image, LayoutGrid, Package, Tent, Wallet } from '@lucide/vue'
import type { Component } from 'vue'

interface Entry {
  label: string
  path: string
  icon: Component
}

/** The board's screens, in the mockup's order. */
const SECTIONS: ReadonlyArray<{ title?: string, entries: readonly Entry[] }> = [
  {
    entries: [
      { label: 'Tableau de bord', path: BOARD_HOME_PATH, icon: LayoutGrid },
      { label: 'Événements', path: '/bureau/evenements', icon: Calendar },
      { label: 'Photos', path: '/bureau/photos', icon: Image },
      { label: 'Documents', path: '/bureau/documents', icon: Folder },
    ],
  },
  {
    title: 'Gestion',
    entries: [
      { label: 'Trésorerie', path: '/bureau/tresorerie', icon: Wallet },
      { label: 'Stock', path: '/bureau/stock', icon: Package },
      { label: 'Matériel', path: '/bureau/materiel', icon: Tent },
      { label: 'Prêts', path: '/bureau/prets', icon: ArrowRightLeft },
    ],
  },
]

const route = useRoute()

// An entry stays current on the pages below it, such as a loan under "Prêts";
// not the dashboard, which every page of the board is below.
function isCurrent({ path }: Entry): boolean {
  return route.path === path || (path !== BOARD_HOME_PATH && route.path.startsWith(`${path}/`))
}

const sections = computed(() =>
  SECTIONS.map(section => ({
    ...section,
    entries: section.entries.map(entry => ({ ...entry, current: isCurrent(entry) })),
  })),
)
</script>

<template>
  <nav
    aria-label="Espace bureau"
    class="flex flex-col gap-0.5"
  >
    <template
      v-for="section in sections"
      :key="section.title ?? 'main'"
    >
      <span
        v-if="section.title"
        class="px-3 pt-4 pb-1.5 text-overline font-semibold text-argent-450 uppercase"
      >{{ section.title }}</span>
      <NuxtLink
        v-for="entry in section.entries"
        :key="entry.path"
        :to="entry.path"
        :aria-current="entry.current ? 'page' : undefined"
        class="flex h-10.5 items-center gap-3 rounded-field px-3 text-ui font-medium text-argent-350 transition-colors hover:bg-sable-850 hover:text-white current:bg-sable-800 current:text-white"
      >
        <component
          :is="entry.icon"
          :size="18"
        />
        {{ entry.label }}
      </NuxtLink>
    </template>
  </nav>
</template>
