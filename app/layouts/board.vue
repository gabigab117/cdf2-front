<script setup lang="ts">
import { X } from '@lucide/vue'

const session = useSessionStore()
const route = useRoute()

// Below the mockup's breakpoint, the sidebar opens as a drawer.
const navigationOpen = ref(false)

onMounted(() => {
  // Who is signed in only fills the sidebar's card: the page shows without waiting.
  if (!session.member) session.loadMember()
})
</script>

<template>
  <div class="flex min-h-dvh bg-argent-50 text-body text-sable-950 print:block print:min-h-0 print:bg-white">
    <div class="sticky top-0 hidden h-dvh shrink-0 md:block print:hidden">
      <BoardSidebar />
    </div>
    <UiDrawer
      v-model:open="navigationOpen"
      label="Navigation de l’espace bureau"
    >
      <div class="relative h-full">
        <BoardSidebar />
        <UiIconButton
          class="absolute top-4 right-3"
          label="Fermer la navigation"
          size="sm"
          surface="dark"
          @click="navigationOpen = false"
        >
          <X :size="18" />
        </UiIconButton>
      </div>
    </UiDrawer>
    <div class="flex min-w-0 flex-1 flex-col">
      <BoardTopBar
        class="print:hidden"
        @open-navigation="navigationOpen = true"
      />
      <main
        class="flex w-full flex-1"
        :class="route.meta.fullWidth ? '' : 'mx-auto max-w-board flex-col px-4 pt-6 pb-10 md:px-8 md:pt-9 md:pb-14 print:p-0'"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
