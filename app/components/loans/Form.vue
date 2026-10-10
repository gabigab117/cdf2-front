<script setup lang="ts">
import { CircleAlert, Clock } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { LoanFields } from '~/utils/loans'

type LoanBorrowerType = components['schemas']['LoanBorrowerType']
type LoanIn = components['schemas']['LoanIn']
type LoanOut = components['schemas']['LoanOut']

// The form of a loan (NouveauPret.dc.html): its borrower, its days, its
// equipment, and beside them the summary that tells whether all of it is free.
// What is free comes from the API at each change of days; the API checks it
// again when the loan is sent, under its locks.
const { loan = null, initial, save } = defineProps<{
  /** The loan to change, or none for a new one. */
  loan?: LoanOut | null
  initial: LoanFields
  /** Sends the loan: the errors to show, or null once it is saved. */
  save: (payload: LoanIn) => Promise<FormErrors | null>
}>()

const fields = ref<LoanFields>(structuredClone(toRaw(initial)))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)
const form = useTemplateRef<HTMLFormElement>('form')

const { calendarPeriod, day } = useDateFormat()
const { amount } = useMoneyFormat()
const now = useNow()

const { data: deposits } = useLoanDeposits()
const { data: events } = useEventList()
const eventOptions = computed(() =>
  (events.value?.items ?? []).map(event => ({ value: event.id, label: `${event.title} · ${day(event.starts_at, { year: true })}` })),
)

const committee = computed(() => fields.value.borrowerType === 'committee')
const look = computed(() => BORROWER_TYPES[fields.value.borrowerType])

// A type changed brings its own deposit; a new loan starts with its type's.
function defaultDeposit(kind: LoanBorrowerType): string | null {
  const found = deposits.value?.deposits.find(deposit => deposit.borrower_type === kind)
  return found ? depositText(found.amount) : null
}
watch(() => fields.value.borrowerType, (kind) => {
  fields.value.deposit = defaultDeposit(kind) ?? fields.value.deposit
})
watch(deposits, () => {
  if (fields.value.deposit === '') fields.value.deposit = defaultDeposit(fields.value.borrowerType) ?? ''
}, { immediate: true })

// The days an event of the committee proposes: from the day before to the day
// after. A reservation being changed keeps its own days for its own event.
const chosenEvent = computed(() => events.value?.items.find(item => item.id === fields.value.event))
watch(chosenEvent, (event, previous) => {
  if (!committee.value || !event || event.id === previous?.id || event.id === loan?.event?.id) return
  fields.value.startDate = addDays(parisDate(event.starts_at), -1)
  fields.value.endDate = addDays(parisDate(event.ends_at ?? event.starts_at), 1)
})

const datesWrong = computed(() => fields.value.endDate < fields.value.startDate)
const days = computed(() => loanDays(fields.value.startDate, fields.value.endDate))
const period = computed(() => calendarPeriod(fields.value.startDate, fields.value.endDate, now.value))
const datesSet = computed(() => fields.value.startDate !== '' && fields.value.endDate !== '' && !datesWrong.value)

const { data: availability, error: availabilityError, status } = useAvailability(() =>
  datesSet.value ? { start: fields.value.startDate, end: fields.value.endDate, excludeLoan: loan?.id ?? null } : null,
)
const items = computed(() => availability.value?.items ?? [])
const order = computed(() => items.value.map(item => item.equipment.id))

const picked = computed(() =>
  items.value
    .filter(item => (fields.value.quantities[item.equipment.id] ?? 0) > 0)
    .map((item) => {
      const quantity = fields.value.quantities[item.equipment.id] ?? 0
      return { item, quantity, beyond: quantity > item.free }
    }),
)
const beyond = computed(() => picked.value.filter(line => line.beyond))

const summaryLines = computed(() =>
  picked.value.map(({ item, quantity, beyond: over }) => ({
    id: item.equipment.id,
    name: item.equipment.name,
    quantity,
    beyond: over ? (item.free === 0 ? 'indisponible' : `${item.free} ${item.free > 1 ? 'libres' : 'libre'}`) : null,
  })),
)

const value = computed(() =>
  amount(picked.value.reduce((sum, { item, quantity }) => sum + quantity * Number(item.equipment.unit_value ?? 0), 0)),
)

const depositLabel = computed(() => {
  if (committee.value) return 'Aucune, usage interne'
  const typed = amountInput(fields.value.deposit)
  return typed === null || Number(typed) === 0 ? 'Aucune' : `Chèque de ${amount(typed)} (non encaissé)`
})

const conflict = computed(() => {
  const lines = beyond.value
  const first = lines[0]
  if (!first) return null
  if (lines.length > 1) return `${lines.length} articles dépassent ce qui est libre sur la période.`
  const free = first.item.free === 0 ? 'aucun libre' : `${first.item.free} ${first.item.free > 1 ? 'libres' : 'libre'}`
  return `${first.item.equipment.name} : ${first.quantity} ${first.quantity > 1 ? 'demandés' : 'demandé'}, ${free} sur la période.`
})

const title = computed(() => (committee.value ? chosenEvent.value?.title : fields.value.borrowerName.trim()) || 'Sans nom')
const nameMissing = computed(() => (committee.value ? fields.value.event === null : fields.value.borrowerName.trim() === ''))
const blocked = computed(() => beyond.value.length > 0 || datesWrong.value || picked.value.length === 0 || nameMissing.value)

// Each line beyond what is free comes back to it, or leaves the loan.
function reduce(): void {
  fields.value.quantities = beyond.value.reduce(
    (quantities, { item }) => withQuantity(quantities, item.equipment.id, item.free),
    fields.value.quantities,
  )
}

// The fields the form shows its errors under: a line's, under its equipment.
const sentOrder = ref<number[]>([])
const SHOWN_FIELDS = ['borrower_type', 'borrower_name', 'purpose', 'phone', 'event', 'start_date', 'end_date', 'deposit_amount', 'notes']

const lineErrors = computed(() => {
  const placed: Record<number, readonly string[]> = {}
  sentOrder.value.forEach((id, index) => {
    const messages = [
      ...(errors.value?.fields[`lines.${index}.quantity`] ?? []),
      ...(errors.value?.fields[`lines.${index}.equipment`] ?? []),
    ]
    if (messages.length) placed[id] = messages
  })
  return placed
})

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

async function submit(): Promise<void> {
  const payload = loanPayload(fields.value, order.value)
  sentOrder.value = payload.lines.map(line => line.equipment)
  const names = sentOrder.value.map(id => items.value.find(item => item.equipment.id === id)?.equipment.name ?? '')
  const shown = new Set([
    ...SHOWN_FIELDS,
    ...sentOrder.value.flatMap((_id, index) => [`lines.${index}.quantity`, `lines.${index}.equipment`]),
  ])
  pending.value = true
  const result = await save(payload)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, shown, path => loanFieldLabel(path, names))
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
    return
  }
  errors.value = null
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-wrap items-start gap-5"
    @submit.prevent="submit"
  >
    <div class="flex min-w-0 flex-1 basis-150 flex-col gap-5">
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
      <LoansFormSection
        :number="1"
        title="Emprunteur"
      >
        <div
          role="group"
          aria-label="Type d’emprunteur"
          class="flex flex-wrap gap-2"
        >
          <UiFilterChip
            v-for="kind in BORROWER_TYPE_VALUES"
            :key="kind"
            :pressed="fields.borrowerType === kind"
            :disabled="loan !== null && (kind === 'committee') !== (loan.borrower_type === 'committee')"
            @click="fields.borrowerType = kind"
          >
            {{ BORROWER_TYPES[kind].label }}
          </UiFilterChip>
        </div>
        <div class="flex flex-wrap gap-3.5">
          <UiField
            v-if="committee"
            v-slot="{ id, describedby, invalid }"
            :label="look.nameLabel"
            class="min-w-0 flex-2 basis-70"
            :errors="fieldErrors('event')"
          >
            <UiSelect
              :id
              v-model="fields.event"
              :options="eventOptions"
              placeholder="Choisir un événement"
              required
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
          <template v-else>
            <UiField
              v-slot="{ id, describedby, invalid }"
              :label="look.nameLabel"
              class="min-w-0 flex-2 basis-70"
              :errors="fieldErrors('borrower_name')"
            >
              <UiInput
                :id
                v-model="fields.borrowerName"
                required
                :aria-describedby="describedby"
                :invalid
              />
            </UiField>
            <UiField
              v-slot="{ id, describedby, invalid }"
              label="Téléphone"
              optional
              class="min-w-0 flex-1 basis-50"
              :errors="fieldErrors('phone')"
            >
              <UiInput
                :id
                v-model="fields.phone"
                type="tel"
                autocomplete="off"
                :aria-describedby="describedby"
                :invalid
              />
            </UiField>
          </template>
        </div>
        <div
          v-if="!committee"
          class="flex flex-wrap gap-3.5"
        >
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Objet du prêt"
            optional
            class="min-w-0 flex-2 basis-70"
            :errors="fieldErrors('purpose')"
          >
            <UiInput
              :id
              v-model="fields.purpose"
              placeholder="Tournoi jeunes"
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Caution"
            help="En euros : un chèque, jamais encaissé."
            class="min-w-0 flex-1 basis-50"
            :errors="fieldErrors('deposit_amount')"
          >
            <UiInput
              :id
              v-model="fields.deposit"
              inputmode="decimal"
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
        </div>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Remarques"
          help="Pour le bureau : elles ne s’impriment pas sur la convention."
          optional
          :errors="fieldErrors('notes')"
        >
          <UiTextarea
            :id
            v-model="fields.notes"
            rows="2"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
      </LoansFormSection>
      <LoansFormSection
        :number="2"
        title="Dates"
      >
        <div class="flex flex-wrap items-end gap-3.5">
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Sortie du matériel"
            class="min-w-0 flex-1 basis-50"
            :errors="fieldErrors('start_date')"
          >
            <UiInput
              :id
              v-model="fields.startDate"
              type="date"
              required
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Retour"
            class="min-w-0 flex-1 basis-50"
            :errors="fieldErrors('end_date')"
          >
            <UiInput
              :id
              v-model="fields.endDate"
              type="date"
              required
              :aria-describedby="describedby"
              :invalid="invalid || datesWrong"
            />
          </UiField>
          <span class="flex h-11.5 min-w-0 flex-1 basis-50 items-center gap-2 rounded-field bg-argent-50 px-3.5 text-sm text-sable-600">
            <Clock :size="16" />
            {{ daysText(days) }}
          </span>
        </div>
        <p
          v-if="datesWrong"
          role="alert"
          class="text-sm font-semibold text-ambre-800"
        >
          La date de retour est avant la date de sortie.
        </p>
      </LoansFormSection>
      <LoansFormSection
        :number="3"
        title="Matériel"
        flush
      >
        <template #aside>
          <span
            v-if="datesSet"
            class="text-note text-argent-600"
          >Disponibilités {{ period }}</span>
        </template>
        <BoardLoadError
          v-if="availabilityError"
          class="mx-5.5 mb-4"
          :message="availabilityError.message"
        />
        <LoansEquipmentPicker
          v-else-if="availability"
          v-model="fields.quantities"
          :items
          :errors="lineErrors"
        />
        <p
          v-else-if="!datesSet"
          class="px-5.5 pb-5 text-sm text-argent-600"
        >
          Choisissez les dates du prêt pour voir le matériel libre.
        </p>
        <p
          v-else-if="status === 'pending'"
          class="px-5.5 pb-5 text-sm text-argent-600"
        >
          Lecture des disponibilités…
        </p>
      </LoansFormSection>
    </div>
    <div class="w-full md:sticky md:top-24 md:max-w-95 md:flex-1 md:basis-80">
      <LoansSummary
        :title
        :subtitle="`${look.label} · ${period}`"
        :lines="summaryLines"
        :value
        :deposit="depositLabel"
        :conflict
        :available="!conflict && picked.length > 0 && !datesWrong"
        :blocked
        :pending
        :action="loan ? 'Enregistrer' : 'Enregistrer le prêt'"
        @reduce="reduce"
      >
        <slot name="actions" />
      </LoansSummary>
    </div>
  </form>
</template>
