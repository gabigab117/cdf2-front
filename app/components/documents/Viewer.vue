<script setup lang="ts">
import { Download } from '@lucide/vue'
import type { components } from '~/types/api'

type DocumentOut = components['schemas']['DocumentOut']

// The original of a document, above the page: an image as it is, a PDF in the
// browser's own viewer, which runs none of its scripts in the application's
// origin. The file is read at each opening. Its URL is released as the viewer
// closes, what it shows staying while it fades out.
const open = defineModel<boolean>('open', { default: false })

const { document } = defineProps<{ document: DocumentOut }>()

const { readDocumentFile, downloadDocument } = useDocumentWrites()

type Shown = { view: FileView, url: string } | { view: null }

const shown = shallowRef<Shown | null>(null)
const failure = ref<string | null>(null)
const downloadFailure = ref<string | null>(null)

const fileLine = computed(() => `${document.original_name} · ${fileSize(document.size)}`)

let url: string | null = null
// What had the focus as the file came: keepFocus() gives it back.
let focused: Element | null = null
// Counts the readings: an answer that arrives once the viewer has closed, or
// opened again, is dropped.
let reading = 0

function release(): void {
  if (url) URL.revokeObjectURL(url)
  url = null
}

async function read(): Promise<void> {
  const current = ++reading
  release()
  shown.value = null
  failure.value = null
  const result = await readDocumentFile(document)
  if (current !== reading) return
  if ('failure' in result) {
    failure.value = result.failure
    return
  }
  const view = fileView(result.file)
  if (!view) {
    shown.value = { view }
    return
  }
  url = URL.createObjectURL(result.file)
  focused = window.document.activeElement
  shown.value = { view, url }
}

// The PDF viewer of Chrome takes the focus just after it has loaded, and keeps
// Escape to itself: the focus goes back where it was, so that Escape closes the
// viewer. Only then: a click in the PDF later hands it the keyboard.
const FOCUS_TAKEN_MS = 1_000

function keepFocus(event: Event): void {
  const frame = event.target
  const loadedAt = performance.now()
  // The page loses the focus to its frame: the window, not the frame, says so.
  // Given back at once, the focus would stay with the viewer, still taking it.
  window.addEventListener('blur', () => {
    const element = focused
    const justLoaded = performance.now() - loadedAt < FOCUS_TAKEN_MS
    if (justLoaded && window.document.activeElement === frame && element instanceof HTMLElement) {
      setTimeout(() => element.focus())
    }
  }, { once: true })
}

watch(open, (isOpen) => {
  downloadFailure.value = null
  if (isOpen) {
    void read()
    return
  }
  reading++
  release()
})

onBeforeUnmount(release)

async function download(): Promise<void> {
  downloadFailure.value = await downloadDocument(document)
}
</script>

<template>
  <UiModal
    v-model:open="open"
    :title="document.title"
    :subtitle="fileLine"
  >
    <template #actions>
      <UiButton
        variant="secondary"
        size="sm"
        @click="download"
      >
        <Download :size="16" />
        Télécharger
      </UiButton>
    </template>
    <p
      v-if="downloadFailure"
      role="alert"
      class="bg-ambre-50 px-5 py-2.5 text-note font-semibold text-ambre-800 md:px-6"
    >
      {{ downloadFailure }}
    </p>
    <div
      v-if="failure"
      class="m-auto w-full max-w-md p-6"
    >
      <BoardLoadError
        :message="failure"
        @retry="read"
      />
    </div>
    <div
      v-else-if="!shown"
      role="status"
      class="m-auto"
    >
      <DocumentsThumbnail class="motion-safe:animate-pulse" />
      <span class="sr-only">Chargement du document…</span>
    </div>
    <iframe
      v-else-if="shown.view === 'pdf'"
      :src="shown.url"
      :title="document.title"
      class="min-h-0 w-full flex-1 border-0 transition-opacity duration-300 starting:opacity-0"
      @load="keepFocus"
    />
    <img
      v-else-if="shown.view === 'image'"
      :src="shown.url"
      :alt="document.title"
      class="min-h-0 w-full flex-1 object-contain p-4 transition-opacity duration-300 md:p-8 starting:opacity-0"
    >
    <div
      v-else
      class="m-auto flex max-w-sm flex-col items-center gap-4 px-6 text-center"
    >
      <DocumentsThumbnail />
      <p class="text-body text-sable-600">
        Ce navigateur n’affiche pas ce fichier dans la page : téléchargez-le pour l’ouvrir.
      </p>
    </div>
  </UiModal>
</template>
