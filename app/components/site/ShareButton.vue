<script setup lang="ts">
import { Share2 } from '@lucide/vue'

const { title } = defineProps<{ title: string }>()

const copied = ref(false)

// The device's own way of sharing, or the address copied where there is none.
async function share(): Promise<void> {
  const url = window.location.href
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return
    }
    catch (error) {
      // The visitor closed the sheet.
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
  }
  catch {
    // Nothing to copy into: the address stays in the browser's bar.
  }
}
</script>

<!-- Only in the browser: without JavaScript, a button that does nothing. -->
<template>
  <ClientOnly>
    <UiButton
      variant="secondary"
      size="lg"
      class="flex-1"
      @click="share"
    >
      <Share2
        :size="18"
        aria-hidden="true"
      />
      {{ copied ? 'Lien copié' : 'Partager' }}
    </UiButton>
    <span
      class="sr-only"
      aria-live="polite"
    >{{ copied ? 'Le lien de la page est copié.' : '' }}</span>
  </ClientOnly>
</template>
