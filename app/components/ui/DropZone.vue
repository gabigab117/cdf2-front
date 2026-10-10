<script setup lang="ts">
import { Upload } from '@lucide/vue'

// A zone a file is dropped onto, or chosen from with its button: the file goes
// to the parent, which decides what becomes of it.
const { accept } = defineProps<{
  /** The types the file picker offers (its `accept` attribute). */
  accept: string
}>()

const emit = defineEmits<{ choose: [file: File] }>()

const input = useTemplateRef<HTMLInputElement>('input')
const over = ref(false)

/** Opens the file picker: within a click, or the browser refuses. */
function choose(): void {
  input.value?.click()
}

function chosen(event: Event): void {
  const picker = event.target as HTMLInputElement
  const file = picker.files?.[0]
  // The same file chosen again is a new choice.
  picker.value = ''
  if (file) emit('choose', file)
}

function dropped(event: DragEvent): void {
  over.value = false
  const file = event.dataTransfer?.files[0]
  if (file) emit('choose', file)
}

defineExpose({ choose })

const classes = {
  base: 'flex items-center gap-3.5 rounded-2xl border-2 border-dashed px-4.5 py-3.5 text-ui transition-colors',
  idle: 'border-argent-300 bg-white text-sable-600',
  over: 'border-azur-600 bg-azur-50 text-sable-800',
}
</script>

<template>
  <div
    :class="[classes.base, over ? classes.over : classes.idle]"
    @dragover.prevent="over = true"
    @dragleave="over = false"
    @drop.prevent="dropped"
  >
    <span
      class="inline-flex size-9.5 shrink-0 items-center justify-center rounded-icon bg-azur-50 text-azur-600"
      aria-hidden="true"
    >
      <Upload :size="18" />
    </span>
    <p>
      <slot />
      <button
        type="button"
        class="font-medium text-azur-600 underline underline-offset-2 hover:text-azur-700"
        @click="choose"
      >
        choisissez un fichier
      </button>.
    </p>
    <input
      ref="input"
      type="file"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      :accept
      @change="chosen"
    >
  </div>
</template>
