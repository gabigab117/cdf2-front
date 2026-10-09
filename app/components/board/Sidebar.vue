<script setup lang="ts">
// Counts, badges and the coming events join the sidebar with the phases that
// compute them.
import { ExternalLink } from '@lucide/vue'
</script>

<template>
  <div class="flex h-full w-64 flex-col gap-7 overflow-y-auto bg-sable-900 px-3.5 py-5 text-argent-350">
    <NuxtLink
      :to="BOARD_HOME_PATH"
      class="flex items-center gap-3 rounded-field px-2 py-1 text-white"
    >
      <UiCoatOfArms
        surface="dark"
        class="h-8 w-7 shrink-0"
      />
      <span class="flex flex-col leading-tight">
        <span class="font-display text-base font-bold">Comité des Fêtes</span>
        <span class="text-xs text-argent-450">Espace bureau</span>
      </span>
    </NuxtLink>
    <BoardNav />
    <div class="mt-auto flex flex-col gap-2">
      <NuxtLink
        to="/"
        class="flex h-10 items-center gap-2.5 rounded-control px-3 text-sm transition-colors hover:bg-sable-850 hover:text-white"
      >
        <ExternalLink :size="16" />
        Voir le site public
      </NuxtLink>
      <BoardUserCard />
    </div>
  </div>
</template>
