<script setup lang="ts">
import { X } from '@lucide/vue'

const open = defineModel<boolean>('open', { default: false })

const { title, subtitle } = defineProps<{
  title: string
  subtitle?: string
}>()

// A modal dialog of the browser, as the drawer: it keeps the focus inside, closes
// on Escape, makes the rest of the page inert while open, and gives the focus
// back to what opened it. Across the screen below 820 px, a framed window above.
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()

watch(open, (isOpen) => {
  if (isOpen) dialog.value?.showModal()
  else dialog.value?.close()
}, { flush: 'post' })

// A click on the backdrop lands on the dialog itself, which its content fills.
function closeFromBackdrop(event: MouseEvent): void {
  if (event.target === dialog.value) open.value = false
}

// It rises from just below and settles, its backdrop darkening; it leaves the
// same way, a little faster. The closed state is where it comes from and goes
// back to: `transition-discrete` keeps it shown, and in the top layer, until it
// has faded out. Its content stays, so that it does not empty as it leaves.
// It is fixed to the window whether open or not: closed, the browser would let
// it fall back to its place in the page while it fades out.
const classes = {
  frame: 'fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none flex-col overflow-hidden border-0 bg-white p-0 text-sable-950 open:flex md:inset-8 md:m-auto md:h-auto md:w-auto md:max-w-5xl md:rounded-card md:shadow-spotlight',
  motion: 'translate-y-4 scale-97 opacity-0 transition-all transition-discrete duration-200 ease-settle open:translate-y-0 open:scale-100 open:opacity-100 open:duration-300 motion-reduce:transition-none starting:open:translate-y-4 starting:open:scale-97 starting:open:opacity-0',
  backdrop: 'backdrop:bg-sable-950/0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200 open:backdrop:bg-sable-950/60 open:backdrop:backdrop-blur-sm open:backdrop:duration-300 motion-reduce:backdrop:transition-none starting:open:backdrop:bg-sable-950/0 starting:open:backdrop:backdrop-blur-none',
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    :class="[classes.frame, classes.motion, classes.backdrop]"
    @close="open = false"
    @click="closeFromBackdrop"
  >
    <header class="flex items-center gap-3 border-b border-argent-100 py-3 pr-3 pl-5 md:py-4 md:pr-4 md:pl-6">
      <div class="min-w-0 flex-1">
        <h2
          :id="titleId"
          class="truncate font-display text-title font-bold"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="truncate text-caption text-argent-600"
        >
          {{ subtitle }}
        </p>
      </div>
      <slot name="actions" />
      <UiIconButton
        label="Fermer"
        size="sm"
        @click="open = false"
      >
        <X :size="16" />
      </UiIconButton>
    </header>
    <div class="flex min-h-0 flex-1 flex-col bg-argent-100">
      <slot />
    </div>
  </dialog>
</template>
