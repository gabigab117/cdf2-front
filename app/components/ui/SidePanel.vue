<script setup lang="ts">
import { X } from '@lucide/vue'

const { title, subtitle, closable = false } = defineProps<{
  title: string
  subtitle?: string
  /** Shows a button that closes the panel. */
  closable?: boolean
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <aside
    :aria-label="title"
    class="flex w-panel shrink-0 flex-col border-l border-argent-200 bg-white"
  >
    <header class="flex flex-col gap-3 border-b border-argent-100 px-6 pt-6 pb-5">
      <div
        v-if="$slots.badge || closable"
        class="flex items-start justify-between gap-3"
      >
        <slot name="badge" />
        <UiIconButton
          v-if="closable"
          class="ml-auto"
          label="Fermer le panneau"
          size="sm"
          @click="emit('close')"
        >
          <X :size="16" />
        </UiIconButton>
      </div>
      <h2 class="font-display text-headline font-bold">
        {{ title }}
      </h2>
      <p
        v-if="subtitle"
        class="text-note text-argent-600"
      >
        {{ subtitle }}
      </p>
    </header>
    <div class="flex flex-1 flex-col gap-4.5 px-6 pt-5 pb-6">
      <slot />
    </div>
    <footer
      v-if="$slots.footer"
      class="flex flex-col gap-2 px-6 pt-4 pb-6"
    >
      <slot name="footer" />
    </footer>
  </aside>
</template>
