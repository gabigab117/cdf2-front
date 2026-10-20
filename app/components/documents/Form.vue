<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
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

const eventOptions = useEventChoices(NO_EVENT_CHOICE)

const form = useTemplateRef<HTMLFormElement>('form')
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending: deleting, failure, ask, dismiss, confirm } = useConfirmation(trigger)

// A document that proves a line of the treasury leaves it without one.
const question = computed(() => {
  const asked = `Supprimer le document « ${document.title} » et son fichier ?`
  const entry = document.ledger_entry
  return entry ? `${asked} Il justifie la ligne « ${entry.label} » de la trésorerie, qui restera sans justificatif.` : asked
})

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

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(fields.value)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, shown.value, documentFieldLabel)
    await focusErrors(form)
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
    <UiAlert
      v-if="errors?.form.length"
      tabindex="-1"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiAlert>
    <UiField
      v-slot="{ control }"
      label="Catégorie"
      :errors="errors?.fields.category"
    >
      <UiSelect
        v-bind="control"
        v-model="fields.category"
        :options="DOCUMENT_CATEGORY_OPTIONS"
      />
    </UiField>
    <UiField
      v-slot="{ control }"
      label="Titre"
      :errors="errors?.fields.title"
    >
      <UiInput
        v-bind="control"
        v-model="fields.title"
        required
      />
    </UiField>
    <UiField
      v-if="!isMinutes"
      v-slot="{ control }"
      :label="issuerLabel"
      optional
      :errors="errors?.fields.issuer"
    >
      <UiInput
        v-bind="control"
        v-model="fields.issuer"
      />
    </UiField>
    <UiField
      v-if="isInvoice"
      v-slot="{ control }"
      label="N° de facture"
      optional
      :errors="errors?.fields.reference"
    >
      <UiInput
        v-bind="control"
        v-model="fields.reference"
      />
    </UiField>
    <div class="grid grid-cols-2 gap-4">
      <UiField
        v-slot="{ control }"
        :label="dateLabel"
        optional
        :errors="errors?.fields.document_date"
      >
        <UiInput
          v-bind="control"
          v-model="fields.documentDate"
          type="date"
        />
      </UiField>
      <UiField
        v-if="isInvoice"
        v-slot="{ control }"
        label="Échéance"
        optional
        :errors="errors?.fields.due_date"
      >
        <UiInput
          v-bind="control"
          v-model="fields.dueDate"
          type="date"
        />
      </UiField>
      <UiField
        v-if="isInvoice"
        v-slot="{ control }"
        label="Payée le"
        optional
        :errors="errors?.fields.paid_on"
      >
        <UiInput
          v-bind="control"
          v-model="fields.paidOn"
          type="date"
        />
      </UiField>
      <UiField
        v-if="isOrder"
        v-slot="{ control }"
        label="Livraison prévue"
        optional
        :errors="errors?.fields['extracted.delivery_date']"
      >
        <UiInput
          v-bind="control"
          v-model="fields.deliveryDate"
          type="date"
        />
      </UiField>
      <UiField
        v-if="!isMinutes"
        v-slot="{ control }"
        :label="amountLabel"
        optional
        :errors="errors?.fields.amount"
      >
        <UiInput
          v-bind="control"
          v-model="fields.amount"
          inputmode="decimal"
          placeholder="0,00"
        />
      </UiField>
    </div>
    <UiField
      v-slot="{ control }"
      label="Événement"
      :errors="errors?.fields.event"
    >
      <UiSelect
        v-bind="control"
        v-model="fields.event"
        :options="eventOptions"
      />
    </UiField>
    <UiField
      v-if="isOrder"
      v-slot="{ control }"
      label="Articles"
      optional
      :errors="errors?.fields['extracted.items']"
    >
      <UiTextarea
        v-bind="control"
        v-model="fields.items"
        rows="2"
      />
    </UiField>
    <UiField
      v-if="isMinutes || isMisc"
      v-slot="{ control }"
      label="Résumé"
      optional
      :errors="errors?.fields['extracted.abstract']"
    >
      <UiTextarea
        v-bind="control"
        v-model="fields.abstract"
        rows="3"
      />
    </UiField>
    <UiField
      v-if="isMinutes"
      v-slot="{ control }"
      label="Décisions"
      optional
      help="Une décision par ligne."
      :errors="errors?.fields['extracted.decisions']"
    >
      <UiTextarea
        v-bind="control"
        v-model="fields.decisions"
        rows="3"
      />
    </UiField>
    <DocumentsTaskLines
      v-if="isMinutes"
      v-model="fields.tasks"
      :errors="errors?.fields ?? {}"
    />
    <UiField
      v-if="isMisc"
      v-slot="{ control }"
      label="Date repérée"
      optional
      help="Telle que le document l’écrit : « 31 oct. · 15 h 30 – 17 h 00 »."
      :errors="errors?.fields['extracted.key_date']"
    >
      <UiInput
        v-bind="control"
        v-model="fields.keyDate"
      />
    </UiField>
    <UiField
      v-slot="{ control }"
      label="Remarque"
      optional
      :errors="errors?.fields.note"
    >
      <UiTextarea
        v-bind="control"
        v-model="fields.note"
        rows="2"
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
