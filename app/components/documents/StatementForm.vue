<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { StatementFields } from '~/utils/documents'

type DocumentOut = components['schemas']['DocumentOut']

// The sworn statement of a purchase whose receipt was lost (D14): what the
// receipt would have told. The API writes it as the statement of the member
// signed in, in a PDF filed as an invoice.
const { event = null } = defineProps<{
  /** The event the purchase was for, when the form comes from one. */
  event?: number | null
}>()

const emit = defineEmits<{ made: [document: DocumentOut] }>()

const SHOWN: ReadonlySet<string> = new Set(['supplier', 'purchase_date', 'purchase', 'amount', 'event'])

const { attestPurchase } = useDocumentWrites()
const events = useEventChoices()
const now = useNow()

const fields = ref<StatementFields>({ supplier: '', purchaseDate: '', purchase: '', amount: '', event })
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const form = useTemplateRef<HTMLFormElement>('form')

const eventOptions = computed(() => [{ value: null, label: `${NO_EVENT_LABEL} (aucun événement)` }, ...events.value])
// The calendar of the date field stops at today; the API refuses a purchase to come.
const today = computed(() => parisDate(now.value))

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await attestPurchase(statementPayload(fields.value))
  pending.value = false
  if (result.errors) {
    errors.value = placeErrors(result.errors, SHOWN, statementFieldLabel)
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
    return
  }
  errors.value = null
  emit('made', result.data)
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
      label="Fournisseur"
      help="Le magasin ou le vendeur, écrit en tête de l’attestation."
      :errors="fieldErrors('supplier')"
    >
      <UiInput
        :id
        v-model="fields.supplier"
        required
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div class="flex flex-wrap items-start gap-4">
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Date de l’achat"
        class="w-full sm:w-56"
        :errors="fieldErrors('purchase_date')"
      >
        <UiInput
          :id
          v-model="fields.purchaseDate"
          type="date"
          :max="today"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Montant TTC"
        class="w-full sm:w-56"
        :errors="fieldErrors('amount')"
      >
        <UiInput
          :id
          v-model="fields.amount"
          inputmode="decimal"
          placeholder="0,00"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
    </div>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Ce qui a été acheté"
      help="En quelques mots : c’est aussi le titre du document."
      :errors="fieldErrors('purchase')"
    >
      <UiInput
        :id
        v-model="fields.purchase"
        required
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
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
    <div class="flex gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        Faire l’attestation
      </UiButton>
      <UiButton
        variant="secondary"
        :to="DOCUMENTS_PATH"
      >
        Annuler
      </UiButton>
    </div>
  </form>
</template>
