<script setup lang="ts">
import { CalendarDays, Menu, Plus } from '@lucide/vue'
import type { Component } from 'vue'

// On a computer the bar holds the « Nouveau » menu alone for now: the bell
// comes with card 4.3 and the assistant with phase 9 (no make-believe interface).
const emit = defineEmits<{ openNavigation: [] }>()

interface Entry {
  label: string
  to: string
  icon: Component
}

/** What the board creates from any of its pages. Each phase adds its entry. */
const NEW_ENTRIES: readonly Entry[] = [
  { label: 'Événement', to: NEW_EVENT_PATH, icon: CalendarDays },
]
</script>

<template>
  <div class="sticky top-0 z-10 flex h-17 shrink-0 items-center gap-3 border-b border-argent-200 bg-argent-50/90 px-4 backdrop-blur-md md:px-8">
    <UiIconButton
      class="md:hidden"
      label="Ouvrir la navigation"
      aria-haspopup="dialog"
      @click="emit('openNavigation')"
    >
      <Menu :size="20" />
    </UiIconButton>
    <NuxtLink
      :to="BOARD_HOME_PATH"
      class="flex items-center gap-2.5 text-sable-950 md:hidden"
    >
      <UiCoatOfArms class="h-7.5 w-6.5" />
      <span class="flex flex-col leading-none">
        <span class="font-display text-base font-bold">Comité des Fêtes</span>
        <span class="mt-0.5 text-xs text-argent-600">Espace bureau</span>
      </span>
    </NuxtLink>
    <UiPopover placement="board">
      <template #invoker="{ invoker }">
        <UiButton
          v-bind="invoker"
          class="ml-auto"
        >
          <Plus :size="18" />
          Nouveau
        </UiButton>
      </template>
      <nav aria-label="Nouveau">
        <ul class="flex flex-col gap-1">
          <li
            v-for="entry in NEW_ENTRIES"
            :key="entry.to"
          >
            <NuxtLink
              :to="entry.to"
              class="flex h-12 items-center gap-3 rounded-field px-4 text-base font-medium text-sable-950 transition-colors hover:bg-argent-100"
            >
              <component
                :is="entry.icon"
                :size="18"
              />
              {{ entry.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </UiPopover>
  </div>
</template>
