<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type DocumentOut = components['schemas']['DocumentOut']
type LedgerCategory = components['schemas']['LedgerCategory']
type LedgerPaymentMethod = components['schemas']['LedgerPaymentMethod']

// The expense of an invoice (A18): a new line at the date it was paid, with
// what the invoice does not tell; or the line entered before the invoice came,
// which the invoice then proves (« Ligne déjà saisie »).
const { document, action } = defineProps<{
  document: DocumentOut
  /** « Valider et créer l’écriture », « Marquer payée » or « Créer l’écriture ». */
  action: string
}>()

const emit = defineEmits<{ done: [document: DocumentOut], cancel: [] }>()

type Mode = 'new' | 'existing'

const MODES: ReadonlyArray<{ value: Mode, label: string }> = [
  { value: 'new', label: 'Nouvelle ligne' },
  { value: 'existing', label: 'Ligne déjà saisie' },
]
const SHOWN: ReadonlySet<string> = new Set(['paid_on', 'label', 'category', 'payment_method', 'advanced_by', 'entry'])
const FIELD_LABELS: Readonly<Record<string, string>> = { paid_on: 'Payée le', entry: 'Ligne' }

const session = useSessionStore()
const { amount } = useMoneyFormat()
const { calendarNumeric } = useDateFormat()
const { data: members } = useBoardMembers()
const { data: missing } = useMissingReceipts()
const { createInvoiceExpense, attachInvoice } = useTreasuryWrites()

const today = useToday()
const categories = categoryOptions('expense')
const paymentMethods = paymentMethodOptions('expense')

const mode = ref<Mode>('new')
const paidOn = ref(document.paid_on ?? today.value)
const label = ref(document.title)
// Chosen by the member: the invoice does not tell them.
const category = ref<LedgerCategory | ''>('')
const paymentMethod = ref<LedgerPaymentMethod | ''>('')
const advancedBy = ref<number | null>(null)
const entry = ref<number | null>(null)
const errors = ref<FormErrors | null>(null)
const pending = ref(false)
const form = useTemplateRef<HTMLFormElement>('form')

const advancers = computed(() => boardMemberOptions(members.value?.items ?? [], null))
const expenses = computed(() =>
  (missing.value?.items ?? []).map(line => ({
    value: line.id,
    label: `${line.label} · ${calendarNumeric(line.date)} · ${amount(line.amount)}`,
  })),
)
const submitLabel = computed(() => (mode.value === 'new' ? action : 'Rattacher la facture'))

// An advance names a member: the one signed in, until another is chosen.
watch(paymentMethod, (method) => {
  if (method === 'advance' && advancedBy.value === null) advancedBy.value = session.member?.id ?? null
})
// The expense of the same amount, if one waits for its receipt.
watch(missing, (found) => {
  entry.value ??= found?.items.find(line => line.amount === document.amount)?.id ?? null
}, { immediate: true })

function fieldLabel(path: string): string {
  return FIELD_LABELS[path] ?? entryFieldLabel(path)
}

async function submit(): Promise<void> {
  pending.value = true
  const result = mode.value === 'new'
    ? await createInvoiceExpense(document.id, {
        paid_on: paidOn.value,
        label: label.value,
        // Left unchosen, the API says so under the field.
        category: category.value as LedgerCategory,
        payment_method: paymentMethod.value as LedgerPaymentMethod,
        advanced_by: paymentMethod.value === 'advance' ? advancedBy.value : null,
      })
    : await attachInvoice(document.id, entry.value ?? 0)
  pending.value = false
  if (result.errors) {
    errors.value = placeErrors(result.errors, SHOWN, fieldLabel)
    await focusErrors(form)
    return
  }
  errors.value = null
  emit('done', result.data)
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-4"
    @submit.prevent="submit"
  >
    <h3 class="text-title font-semibold">
      Dépense de la facture
    </h3>
    <UiSegmentedControl
      v-model="mode"
      :options="MODES"
      label="Ligne de la dépense"
    />
    <UiAlertText
      v-if="errors?.form.length"
      tabindex="-1"
    >
      {{ errors.form.join(' ') }}
    </UiAlertText>
    <template v-if="mode === 'new'">
      <UiField
        v-slot="{ control }"
        label="Payée le"
        :errors="errors?.fields.paid_on"
      >
        <UiInput
          v-bind="control"
          v-model="paidOn"
          type="date"
          :max="today"
          required
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Libellé"
        :errors="errors?.fields.label"
      >
        <UiInput
          v-bind="control"
          v-model="label"
          required
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Catégorie"
        :errors="errors?.fields.category"
      >
        <UiSelect
          v-bind="control"
          v-model="category"
          :options="categories"
          placeholder="Choisir une catégorie"
          required
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Moyen de paiement"
        :errors="errors?.fields.payment_method"
      >
        <UiSelect
          v-bind="control"
          v-model="paymentMethod"
          :options="paymentMethods"
          placeholder="Choisir un moyen de paiement"
          required
        />
      </UiField>
      <UiField
        v-if="paymentMethod === 'advance'"
        v-slot="{ control }"
        label="Avancé par"
        :errors="errors?.fields.advanced_by"
      >
        <UiSelect
          v-bind="control"
          v-model="advancedBy"
          :options="advancers"
          placeholder="Choisir un membre"
        />
      </UiField>
    </template>
    <template v-else>
      <UiField
        v-if="expenses.length > 0"
        v-slot="{ control }"
        label="Dépense sans justificatif"
        help="La facture devient son justificatif, payée à sa date si elle n’en dit pas d’autre."
        :errors="errors?.fields.entry"
      >
        <UiSelect
          v-bind="control"
          v-model="entry"
          :options="expenses"
          placeholder="Choisir une dépense"
          required
        />
      </UiField>
      <p
        v-else
        class="text-sm text-argent-600"
      >
        Aucune dépense n’attend son justificatif.
      </p>
    </template>
    <div class="flex flex-col gap-2">
      <UiButton
        type="submit"
        variant="accent"
        size="lg"
        block
        :loading="pending"
        :disabled="mode === 'existing' && expenses.length === 0"
      >
        {{ submitLabel }}
      </UiButton>
      <UiButton
        variant="secondary"
        block
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
    </div>
  </form>
</template>
