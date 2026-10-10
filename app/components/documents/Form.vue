<script setup lang="ts">
import { CircleAlert, Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { DocumentFields } from '~/utils/documents'

type DocumentOut = components['schemas']['DocumentOut']

// « Corriger »: how a document is classified, and its fields, those of its
// category. The fields of another category keep their values: the document is
// sent whole.
const { document, save, remove } = defineProps<{
  document: DocumentOut
  /** Sends the document: the errors to show, or null once it is saved. */
  save: (fields: DocumentFields) => Promise<FormErrors | null>
  /** Deletes the document: null once done, or the message to show. */
  remove: () => Promise<string | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [], deleted: [] }>()

const fields = ref<DocumentFields>(documentFields(document))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const events = useEventChoices()
const eventOptions = computed(() => [{ value: null, label: `${NO_EVENT_LABEL} (aucun événement)` }, ...events.value])

const form = useTemplateRef<HTMLFormElement>('form')
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending: deleting, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const question = computed(() => `Supprimer le document « ${document.title} » et son fichier ?`)

const category = computed(() => fields.value.category)
const isInvoice = computed(() => category.value === 'invoice')
const isOrder = computed(() => category.value === 'order')
const isMinutes = computed(() => category.value === 'minutes')
const isMisc = computed(() => category.value === 'misc')

// The fields each category shows, by their path in the API's answer.
const shown = computed<ReadonlySet<string>>(() => new Set([
  'category', 'title', 'event', 'document_date', 'note',
  ...(isMinutes.value ? [] : ['issuer', 'amount']),
  ...(isInvoice.value ? ['reference', 'due_date', 'paid_on'] : []),
  ...(isOrder.value ? ['extracted.delivery_date', 'extracted.items'] : []),
  ...(isMinutes.value || isMisc.value ? ['extracted.abstract'] : []),
  ...(isMinutes.value ? ['extracted.decisions', ...taskPaths()] : []),
  ...(isMisc.value ? ['extracted.key_date'] : []),
]))

function taskPaths(): string[] {
  return fields.value.tasks.flatMap((_task, index) => [`extracted.tasks.${index}.title`, `extracted.tasks.${index}.assignee`])
}

const dateLabel = computed(() => (isOrder.value ? 'Commandé le' : isMinutes.value ? 'Date de la réunion' : 'Date du document'))
const issuerLabel = computed(() => (isInvoice.value || isOrder.value ? 'Fournisseur' : 'Émetteur'))
const amountLabel = computed(() => (isInvoice.value ? 'Montant TTC' : 'Montant'))

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(fields.value)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, shown.value, documentFieldLabel)
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
    return
  }
  errors.value = null
  emit('saved')
}

async function deleteDocument(): Promise<void> {
  if (await confirm(remove)) emit('deleted')
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-4"
    @submit.prevent="submit"
  >
    <UiCallout
      v-if="errors?.form.length"
      tone="ambre"
      role="alert"
      tabindex="-1"
      :icon="CircleAlert"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiCallout>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Catégorie"
      :errors="fieldErrors('category')"
    >
      <UiSelect
        :id
        v-model="fields.category"
        :options="DOCUMENT_CATEGORY_OPTIONS"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Titre"
      :errors="fieldErrors('title')"
    >
      <UiInput
        :id
        v-model="fields.title"
        required
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-if="!isMinutes"
      v-slot="{ id, describedby, invalid }"
      :label="issuerLabel"
      optional
      :errors="fieldErrors('issuer')"
    >
      <UiInput
        :id
        v-model="fields.issuer"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-if="isInvoice"
      v-slot="{ id, describedby, invalid }"
      label="N° de facture"
      optional
      :errors="fieldErrors('reference')"
    >
      <UiInput
        :id
        v-model="fields.reference"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div class="grid grid-cols-2 gap-4">
      <UiField
        v-slot="{ id, describedby, invalid }"
        :label="dateLabel"
        optional
        :errors="fieldErrors('document_date')"
      >
        <UiInput
          :id
          v-model="fields.documentDate"
          type="date"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-if="isInvoice"
        v-slot="{ id, describedby, invalid }"
        label="Échéance"
        optional
        :errors="fieldErrors('due_date')"
      >
        <UiInput
          :id
          v-model="fields.dueDate"
          type="date"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-if="isInvoice"
        v-slot="{ id, describedby, invalid }"
        label="Payée le"
        optional
        :errors="fieldErrors('paid_on')"
      >
        <UiInput
          :id
          v-model="fields.paidOn"
          type="date"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-if="isOrder"
        v-slot="{ id, describedby, invalid }"
        label="Livraison prévue"
        optional
        :errors="fieldErrors('extracted.delivery_date')"
      >
        <UiInput
          :id
          v-model="fields.deliveryDate"
          type="date"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-if="!isMinutes"
        v-slot="{ id, describedby, invalid }"
        :label="amountLabel"
        optional
        :errors="fieldErrors('amount')"
      >
        <UiInput
          :id
          v-model="fields.amount"
          inputmode="decimal"
          placeholder="0,00"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
    </div>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Événement"
      :errors="fieldErrors('event')"
    >
      <UiSelect
        :id
        v-model="fields.event"
        :options="eventOptions"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-if="isOrder"
      v-slot="{ id, describedby, invalid }"
      label="Articles"
      optional
      :errors="fieldErrors('extracted.items')"
    >
      <UiTextarea
        :id
        v-model="fields.items"
        rows="2"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-if="isMinutes || isMisc"
      v-slot="{ id, describedby, invalid }"
      label="Résumé"
      optional
      :errors="fieldErrors('extracted.abstract')"
    >
      <UiTextarea
        :id
        v-model="fields.abstract"
        rows="3"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-if="isMinutes"
      v-slot="{ id, describedby, invalid }"
      label="Décisions"
      optional
      help="Une décision par ligne."
      :errors="fieldErrors('extracted.decisions')"
    >
      <UiTextarea
        :id
        v-model="fields.decisions"
        rows="3"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <DocumentsTaskLines
      v-if="isMinutes"
      v-model="fields.tasks"
      :errors="errors?.fields ?? {}"
    />
    <UiField
      v-if="isMisc"
      v-slot="{ id, describedby, invalid }"
      label="Date repérée"
      optional
      help="Telle que le document l’écrit : « 31 oct. · 15 h 30 – 17 h 00 »."
      :errors="fieldErrors('extracted.key_date')"
    >
      <UiInput
        :id
        v-model="fields.keyDate"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Remarque"
      optional
      :errors="fieldErrors('note')"
    >
      <UiTextarea
        :id
        v-model="fields.note"
        rows="2"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div class="flex flex-wrap items-center gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        Enregistrer
      </UiButton>
      <UiButton
        variant="secondary"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
      <UiButton
        ref="trigger"
        variant="link"
        class="ml-auto"
        @click="ask"
      >
        <Trash2 :size="16" />
        Supprimer
      </UiButton>
    </div>
    <UiConfirmation
      v-if="confirming"
      :question
      :pending="deleting"
      :failure
      @confirm="deleteDocument"
      @cancel="dismiss"
    />
  </form>
</template>
