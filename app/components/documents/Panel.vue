<script setup lang="ts">
import { Check, Download, Eye, PencilLine } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'
import type { DocumentFields } from '~/utils/documents'

// The panel of a document beside the list: what it tells, its file, and its
// review. A document awaiting review is completed (« Corriger »), then
// validated; a validated one stays correctable. An invoice paid becomes an
// expense of the treasury, which its panel creates (A18).
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
const { correctDocument, validateDocument, deleteDocument, downloadDocument } = useDocumentWrites()
const { writtenDay } = useDateFormat()
const now = useNow()

const editing = ref(startEditing)
// The action that opened the expense of the invoice, while its form shows.
const paying = ref<string | null>(null)
const viewing = ref(false)
const validating = ref(false)
const failure = ref<string | null>(null)

const look = computed(() => (document.value ? DOCUMENT_CATEGORIES[document.value.category] : null))
const toReview = computed(() => document.value?.status === 'to_review')
// What an order brings to the stock, entered by hand before the assistant (7.4).
const isOrder = computed(() => document.value?.category === 'order')
const payment = computed(() => (document.value ? paymentAction(document.value) : null))
// « Validée par Sophie L. · écriture créée le 29 sept. »
const validated = computed(() => {
  if (!document.value) return ''
  const entry = document.value.ledger_entry
  const created = entry ? ` · écriture créée le ${writtenDay(entry.created_at, now.value)}` : ''
  return `${validationText(document.value)}${created}`
})

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
  // An invoice paid is validated with its expense, whose form asks what the
  // invoice does not tell.
  if (document.value?.category === 'invoice' && document.value.paid_on) {
    paying.value = validationAction(document.value)
    return
  }
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

function paid(written: NonNullable<typeof document.value>): void {
  paying.value = null
  document.value = written
  emit('changed')
}

function remove(): Promise<string | null> {
  return deleteDocument(id)
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
    @close="emit('close')"
  >
    <template #pill>
      <UiStatusPill :tone="look.tone">
        {{ look.label }}
      </UiStatusPill>
    </template>
    <div class="-mx-6 flex items-center gap-3.5 border-b border-argent-100 px-6 pb-4">
      <DocumentsThumbnail />
      <div class="flex flex-col gap-2">
        <UiButton
          variant="secondary"
          size="sm"
          aria-haspopup="dialog"
          @click="viewing = true"
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
    <DocumentsViewer
      v-model:open="viewing"
      :document
    />
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
      {{ validated }}
      <template
        v-if="document.ledger_entry"
        #actions
      >
        <UiButton
          variant="link"
          :to="entryPath(document.ledger_entry.id)"
        >
          Voir la ligne
        </UiButton>
      </template>
    </UiCallout>
    <p
      v-if="failure"
      role="alert"
      class="text-sm font-semibold text-ambre-800"
    >
      {{ failure }}
    </p>
    <DocumentsInvoiceExpense
      v-if="paying"
      :document
      :action="paying"
      @done="paid"
      @cancel="paying = null"
    />
    <DocumentsForm
      v-else-if="editing"
      :document
      :save="correct"
      :remove
      @saved="corrected"
      @cancel="editing = false"
      @deleted="emit('deleted')"
    />
    <template v-else>
      <DocumentsDetails :document />
      <DocumentsOrderLines
        v-if="isOrder"
        :id
        :validated="!toReview"
      />
    </template>
    <template
      v-if="!editing && !paying"
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
        v-else-if="payment"
        variant="accent"
        size="lg"
        block
        @click="paying = payment"
      >
        <Check :size="18" />
        {{ payment }}
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
