<script setup lang="ts">
import { Menu } from '@lucide/vue'

// On a computer the bar stays empty for now: "Nouveau" comes with card 2.6, the
// bell with 4.3 and the assistant with phase 9 (no make-believe interface).
const emit = defineEmits<{ openNavigation: [] }>()
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
  </div>
</template>
