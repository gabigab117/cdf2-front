<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const { label } = defineProps<{
  /** What the drawer holds, for screen readers. */
  label: string
}>()

// A modal dialog of the browser: it keeps the focus inside, closes on Escape, and
// makes the rest of the page inert while open. Its content only exists while it
// is open: what it holds often shows elsewhere on larger screens.
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

watch(open, (isOpen) => {
  if (isOpen) dialog.value?.showModal()
  else dialog.value?.close()
}, { flush: 'post' })

// Following a link of the drawer leaves it behind.
const route = useRoute()
watch(() => route.fullPath, () => {
  open.value = false
})

// A click on the backdrop lands on the dialog itself, which its content fills.
function closeFromBackdrop(event: MouseEvent): void {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="label"
    class="right-auto m-0 h-dvh max-h-none w-fit max-w-none border-0 bg-transparent p-0 backdrop:bg-sable-950/50"
    @close="open = false"
    @click="closeFromBackdrop"
  >
    <slot v-if="open" />
  </dialog>
</template>
