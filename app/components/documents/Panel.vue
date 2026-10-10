<script setup lang="ts">
import { Check, Download, Eye, PencilLine } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'
import type { DocumentFields } from '~/utils/documents'

// The panel of a document beside the list: what it tells, its file, and its
// review. A document awaiting review is completed (« Corriger »), then
// validated; a validated one stays correctable, as an invoice paid later.
const { id, startEditing = false } = defineProps<{
  id: number
  /** Open on its form: the document just deposited, to complete. */
  startEditing?: boolean
}>()

const emit = defineEmits<{
  /** The document changed: the lists that show it are fetched again. */
  changed: []
  deleted: []
  close: []
}>()

const { data: document, error, refresh } = useDocument(id)
const { correctDocument, validateDocument, deleteDocument, openDocument, downloadDocument } = useDocumentWrites()

const editing = ref(startEditing)
const validating = ref(false)
const failure = ref<string | null>(null)

const look = computed(() => (document.value ? DOCUMENT_CATEGORIES[document.value.category] : null))
const toReview = computed(() => document.value?.status === 'to_review')

async function correct(fields: DocumentFields): Promise<FormErrors | null> {
  const result = await correctDocument(id, documentPayload(fields))
  if (result.errors) return result.errors
  // The answer is the document as it now stands: no second reading.
  document.value = result.data
  return null
}

function corrected(): void {
  editing.value = false
  emit('changed')
}

async function validate(): Promise<void> {
  validating.value = true
  const result = await validateDocument(id)
  validating.value = false
  if (result.errors) {
    // The form is not on screen: every error is told in the panel, a task's
    // after its name.
    const placed = placeErrors(result.errors, new Set(), documentFieldLabel)
    failure.value = placed.form.join(' ')
    return
  }
  failure.value = null
  document.value = result.data
  emit('changed')
}

function remove(): Promise<string | null> {
  return deleteDocument(id)
}

// openDocument() opens its tab within the click, before any await.
async function open(): Promise<void> {
  if (document.value) failure.value = await openDocument(document.value)
}

async function download(): Promise<void> {
  if (document.value) failure.value = await downloadDocument(document.value)
}
</script>

<template>
  <UiSidePanel
    v-if="document && look"
    :title="document.title"
    :subtitle="depositLine(document)"
    closable
    @close="emit('close')"
  >
    <template #badge>
      <UiStatusPill :tone="look.tone">
        {{ look.label }}
      </UiStatusPill>
    </template>
    <div class="-mx-6 flex items-center gap-3.5 border-b border-argent-100 px-6 pb-4">
      <div
        class="flex h-28 w-21.5 shrink-0 flex-col gap-1.5 rounded-lg bg-white px-2.5 py-3 shadow-float ring-1 ring-argent-200"
        aria-hidden="true"
      >
        <span class="h-1.5 w-3/5 rounded-full bg-sable-950" />
        <span class="h-1 w-11/12 rounded-full bg-argent-200" />
        <span class="h-1 w-4/5 rounded-full bg-argent-200" />
        <span class="h-1 w-5/6 rounded-full bg-argent-200" />
        <span class="mt-auto h-1.5 w-2/5 self-end rounded-full bg-azur-600" />
      </div>
      <div class="flex flex-col gap-2">
        <UiButton
          variant="secondary"
          size="sm"
          @click="open"
        >
          <Eye :size="16" />
          Ouvrir l’original
        </UiButton>
        <UiButton
          variant="secondary"
          size="sm"
          @click="download"
        >
          <Download :size="16" />
          Télécharger
        </UiButton>
      </div>
    </div>
    <UiCallout
      v-if="toReview"
      tone="ambre"
      :icon="PencilLine"
    >
      Complétez et vérifiez les informations avant de valider.
    </UiCallout>
    <UiCallout
      v-else
      :icon="Check"
    >
      {{ validationText(document) }}
    </UiCallout>
    <p
      v-if="failure"
      role="alert"
      class="text-sm font-semibold text-ambre-800"
    >
      {{ failure }}
    </p>
    <DocumentsForm
      v-if="editing"
      :document
      :save="correct"
      :remove
      @saved="corrected"
      @cancel="editing = false"
      @deleted="emit('deleted')"
    />
    <DocumentsDetails
      v-else
      :document
    />
    <template
      v-if="!editing"
      #footer
    >
      <UiButton
        v-if="toReview"
        variant="accent"
        size="lg"
        block
        :loading="validating"
        @click="validate"
      >
        <Check :size="18" />
        {{ validationAction(document) }}
      </UiButton>
      <UiButton
        variant="secondary"
        size="md"
        block
        @click="editing = true"
      >
        Corriger
      </UiButton>
    </template>
  </UiSidePanel>
  <div
    v-else-if="error"
    class="p-6 md:w-panel"
  >
    <BoardLoadError
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
