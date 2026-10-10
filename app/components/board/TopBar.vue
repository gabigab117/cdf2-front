<script setup lang="ts">
import { Bell, CalendarDays, FileText, ListChecks, Menu, Plus } from '@lucide/vue'
import type { Component } from 'vue'

// On a computer the bar holds the bell, then the « Nouveau » menu, or the
// action of the page shown in its place. The assistant comes with phase 9 (no
// make-believe interface).
const emit = defineEmits<{ openNavigation: [] }>()

const route = useRoute()

// What awaits the board (A6), from its overview: a dot on the bell if anything.
const { data: overview } = useBoardOverview()
const pending = computed(() => overview.value?.pending ?? null)
const bellLabel = computed(() => {
  const total = pending.value?.total ?? 0
  return total > 0 ? `À traiter (${total})` : 'À traiter'
})

interface Entry {
  label: string
  to: string
  icon: Component
}

/** What the board creates from any of its pages. Each phase adds its entry. */
const NEW_ENTRIES: readonly Entry[] = [
  { label: 'Événement', to: NEW_EVENT_PATH, icon: CalendarDays },
  { label: 'Tâche', to: NEW_TASK_PATH, icon: ListChecks },
  { label: 'Document', to: NEW_DOCUMENT_PATH, icon: FileText },
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
    <div class="ml-auto flex items-center gap-2">
      <UiPopover placement="board-wide">
        <template #invoker="{ invoker }">
          <UiIconButton
            v-bind="invoker"
            class="relative"
            :label="bellLabel"
          >
            <Bell :size="18" />
            <span
              v-if="pending && pending.total > 0"
              class="absolute top-2.5 right-2.75 size-2 rounded-full bg-azur-600 ring-2 ring-white"
              aria-hidden="true"
            />
          </UiIconButton>
        </template>
        <BoardPendingPanel :pending />
      </UiPopover>
      <!-- Where a page renders its own action: always there, for its Teleport to find. -->
      <div
        id="board-top-bar-action"
        class="contents"
      />
      <UiPopover
        v-if="!route.meta.topBarAction"
        placement="board"
      >
        <template #invoker="{ invoker }">
          <BoardTopBarButton
            v-bind="invoker"
            :icon="Plus"
            label="Nouveau"
          />
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
  </div>
</template>
