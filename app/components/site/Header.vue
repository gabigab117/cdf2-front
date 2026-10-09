<script setup lang="ts">
import { Menu, X } from '@lucide/vue'
</script>

<template>
  <header class="border-b border-argent-200 bg-argent-50 md:sticky md:top-0 md:z-20 md:bg-argent-50/86 md:backdrop-blur-header">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3.5 md:px-6">
      <NuxtLink
        to="/"
        aria-label="Comité des Fêtes d’Ons-en-Bray, accueil"
        class="flex items-center gap-2.5 text-sable-950 md:gap-3"
      >
        <UiCoatOfArms class="h-7.5 w-6.5 md:h-8.5 md:w-7.5" />
        <span class="flex flex-col leading-none">
          <span class="font-display text-base font-bold md:text-title md:tracking-brand">Comité des Fêtes</span>
          <span class="mt-0.5 text-xs text-argent-600 md:text-caption md:tracking-place">Ons-en-Bray</span>
        </span>
      </NuxtLink>
      <SiteNav class="hidden md:block" />
      <!-- The menu of a phone opens and closes without any JavaScript. -->
      <UiPopover placement="site">
        <template #invoker="{ invoker }">
          <UiIconButton
            v-bind="invoker"
            label="Ouvrir le menu"
            class="md:hidden"
          >
            <Menu :size="20" />
          </UiIconButton>
        </template>
        <template #default="{ closer }">
          <div class="flex items-center justify-between gap-3 pb-1 pl-4">
            <span class="text-overline font-semibold text-argent-600 uppercase">Menu</span>
            <UiIconButton
              v-bind="closer"
              label="Fermer le menu"
            >
              <X :size="20" />
            </UiIconButton>
          </div>
          <SiteNav stacked />
        </template>
      </UiPopover>
    </div>
  </header>
</template>
