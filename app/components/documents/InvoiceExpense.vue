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

const now = useNow()
const session = useSessionStore()
const { amount } = useMoneyFormat()
const { calendarNumeric } = useDateFormat()
const { data: members } = useBoardMembers()
const { data: missing } = useMissingReceipts()
const { createInvoiceExpense, attachInvoice } = useTreasuryWrites()

const today = computed(() => parisDate(now.value))
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

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

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
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
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
    <p
      v-if="errors?.form.length"
      role="alert"
      tabindex="-1"
      class="text-sm font-semibold text-ambre-800"
    >
      {{ errors.form.join(' ') }}
    </p>
    <template v-if="mode === 'new'">
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Payée le"
        :errors="fieldErrors('paid_on')"
      >
        <UiInput
          :id
          v-model="paidOn"
          type="date"
          :max="today"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Libellé"
        :errors="fieldErrors('label')"
      >
        <UiInput
          :id
          v-model="label"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Catégorie"
        :errors="fieldErrors('category')"
      >
        <UiSelect
          :id
          v-model="category"
          :options="categories"
          placeholder="Choisir une catégorie"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Moyen de paiement"
        :errors="fieldErrors('payment_method')"
      >
        <UiSelect
          :id
          v-model="paymentMethod"
          :options="paymentMethods"
          placeholder="Choisir un moyen de paiement"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-if="paymentMethod === 'advance'"
        v-slot="{ id, describedby, invalid }"
        label="Avancé par"
        :errors="fieldErrors('advanced_by')"
      >
        <UiSelect
          :id
          v-model="advancedBy"
          :options="advancers"
          placeholder="Choisir un membre"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
    </template>
    <template v-else>
      <UiField
        v-if="expenses.length > 0"
        v-slot="{ id, describedby, invalid }"
        label="Dépense sans justificatif"
        help="La facture devient son justificatif, payée à sa date si elle n’en dit pas d’autre."
        :errors="fieldErrors('entry')"
      >
        <UiSelect
          :id
          v-model="entry"
          :options="expenses"
          placeholder="Choisir une dépense"
          required
          :aria-describedby="describedby"
          :invalid
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
