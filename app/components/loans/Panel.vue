<script setup lang="ts">
import { ArrowRightLeft, CalendarDays, CircleAlert, FileCheck, FileText, FileUp, PencilLine, Phone, RotateCcw, X } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors, Written } from '~/utils/api-errors'

type LoanOut = components['schemas']['LoanOut']
type LoanReturnIn = components['schemas']['LoanReturnIn']
type ShortageOut = components['schemas']['ShortageOut']

// The panel of a loan beside the list: whom it lends to and when, what it
// takes, and the step it calls for: its checkout, its return, its reopening.
const { id } = defineProps<{ id: number }>()

const emit = defineEmits<{
  /** The loan changed: the list and its counts are fetched again. */
  changed: []
  close: []
}>()

const { data: loan, error, refresh } = useLoan(id)
const { checkOut, returnLoan, reopenLoan, cancelLoan, depositAgreement } = useLoanWrites()
const { calendarPeriod, calendarWeekday, writtenDay } = useDateFormat()
const { amount } = useMoneyFormat()
const now = useNow()

// The loans to come that the last return leaves short (A17).
const shortages = ref<ShortageOut[]>([])

const look = computed(() => (loan.value ? LOAN_STATES[loan.value.state] : null))
const state = computed(() => loan.value?.state)
const title = computed(() => (loan.value?.purpose ? `${loan.value.display_name} — ${loan.value.purpose}` : loan.value?.display_name ?? ''))
const headline = computed(() => (loan.value ? loanHeadline(loan.value, parisDate(now.value), date => calendarWeekday(date, now.value)) : ''))
const facts = computed(() => {
  const shown = loan.value
  if (!shown) return ''
  const period = calendarPeriod(shown.start_date, shown.end_date, now.value)
  return [period.charAt(0).toUpperCase() + period.slice(1), shown.number ?? 'réservation interne', depositFact(shown, amount)].join(' · ')
})

// Each line, and how it came back when not whole.
const lines = computed(() =>
  (loan.value?.lines ?? []).map(line => ({
    id: line.id,
    name: line.equipment.name,
    quantity: line.quantity,
    back: returnNotes([line]).replace(`${line.equipment.name} : `, ''),
  })),
)

const canCheckOut = computed(() => state.value === 'to_prepare' || state.value === 'confirmed')
const canReturn = computed(() => state.value === 'out' || state.value === 'overdue')
const canReopen = computed(() => state.value === 'returned')
const canCancel = computed(() => canCheckOut.value || state.value === 'committee')
const canEdit = computed(() => canCancel.value || canReturn.value)
// A loan to someone is signed for; the committee's is not, nor a loan cancelled.
const signed = computed(() => state.value !== undefined && state.value !== 'committee' && state.value !== 'cancelled')

// The signed agreement, deposited as a document: the file picked goes at once.
const picker = useTemplateRef<HTMLInputElement>('picker')
const depositing = ref(false)
const depositFailure = ref('')
const agreementText = computed(() => {
  const agreement = loan.value?.agreement
  return agreement ? `Convention signée, déposée le ${writtenDay(agreement.created_at, now.value)}` : ''
})

async function deposit(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Picked again, the same file is sent again.
  input.value = ''
  if (!file || depositing.value) return
  depositing.value = true
  depositFailure.value = ''
  const result = await depositAgreement(id, file)
  depositing.value = false
  if (result.errors) {
    const placed = placeErrors(result.errors, new Set(['file']), path => path)
    depositFailure.value = [...(placed.fields.file ?? []), ...placed.form].join(' ')
    return
  }
  loan.value = result.data
  emit('changed')
}

const checkoutTrigger = useTemplateRef<ComponentPublicInstance>('checkoutTrigger')
const reopenTrigger = useTemplateRef<ComponentPublicInstance>('reopenTrigger')
const cancelTrigger = useTemplateRef<ComponentPublicInstance>('cancelTrigger')
const checkout = useConfirmation(checkoutTrigger)
const reopening = useConfirmation(reopenTrigger)
const cancelling = useConfirmation(cancelTrigger)

const cancelQuestion = computed(() =>
  state.value === 'committee' ? 'Annuler cette réservation ? Son matériel redevient libre.' : 'Annuler ce prêt ? Son matériel redevient libre.',
)

// A step refused tells why, with the question that asked for it.
async function step(write: () => Promise<Written<LoanOut>>): Promise<string | null> {
  const result = await write()
  if (result.errors) return placeErrors(result.errors, new Set(), path => path).form.join(' ')
  loan.value = result.data
  emit('changed')
  return null
}

async function confirmCheckout(): Promise<void> {
  if (await checkout.confirm(() => step(() => checkOut(id)))) void checkout.dismiss()
}

async function confirmReopen(): Promise<void> {
  if (await reopening.confirm(() => step(() => reopenLoan(id)))) void reopening.dismiss()
}

async function confirmCancel(): Promise<void> {
  if (await cancelling.confirm(() => step(() => cancelLoan(id)))) void cancelling.dismiss()
}

async function recordReturn(payload: LoanReturnIn): Promise<FormErrors | null> {
  const result = await returnLoan(id, payload)
  if (result.errors) return result.errors
  loan.value = result.data.loan
  shortages.value = result.data.shortages
  emit('changed')
  return null
}

const shortageLines = computed(() =>
  shortages.value.map(shortage => ({
    id: shortage.equipment.id,
    text: `${shortage.equipment.name} : les prêts en prennent ${shortage.taken} le ${calendarWeekday(shortage.day, now.value)}, `
      + `${shortage.offered} ${shortage.offered > 1 ? 'restent' : 'reste'} (${shortage.loans.map(item => item.number ?? item.display_name).join(', ')}).`,
  })),
)
</script>

<template>
  <section
    v-if="loan && look"
    :aria-label="loan.display_name"
    class="flex flex-col overflow-hidden rounded-card border border-argent-200 bg-white"
  >
    <header class="flex flex-col gap-1 border-b border-argent-100 px-5 py-4.5">
      <div class="flex items-start justify-between gap-3">
        <UiStatusPill :tone="look.tone">
          {{ headline }}
        </UiStatusPill>
        <UiIconButton
          label="Fermer la fiche"
          size="sm"
          @click="emit('close')"
        >
          <X :size="16" />
        </UiIconButton>
      </div>
      <h2 class="mt-1.5 text-lg font-semibold text-sable-950">
        {{ title }}
      </h2>
      <p class="text-note text-argent-600">
        {{ facts }}
      </p>
    </header>
    <div class="flex flex-col gap-4 px-5 pt-1 pb-5">
      <LoansReturnForm
        v-if="canReturn"
        :key="`${loan.id}:${loan.status}`"
        :lines="loan.lines"
        :save="recordReturn"
      />
      <ul
        v-else
        class="flex flex-col divide-y divide-argent-100"
      >
        <li
          v-for="line in lines"
          :key="line.id"
          class="flex flex-col gap-0.5 py-2.5 text-ui"
        >
          <span class="flex justify-between gap-2.5">
            <span>{{ line.name }}</span>
            <span class="font-mono font-semibold">× {{ line.quantity }}</span>
          </span>
          <span
            v-if="line.back"
            class="text-note text-ambre-800"
          >{{ line.back }}</span>
        </li>
      </ul>
      <UiCallout
        v-if="shortageLines.length"
        tone="ambre"
        role="alert"
        :icon="CircleAlert"
        title="Des prêts à venir manquent désormais de matériel"
      >
        <p
          v-for="shortage in shortageLines"
          :key="shortage.id"
        >
          {{ shortage.text }}
        </p>
      </UiCallout>
      <dl
        v-if="loan.phone || loan.notes"
        class="flex flex-col gap-2 text-sm"
      >
        <div
          v-if="loan.phone"
          class="flex items-center gap-2"
        >
          <dt>
            <Phone
              :size="15"
              aria-label="Téléphone"
            />
          </dt>
          <dd>
            <a
              :href="`tel:${loan.phone.replaceAll(' ', '')}`"
              class="text-azur-600 hover:text-azur-700"
            >{{ loan.phone }}</a>
          </dd>
        </div>
        <div v-if="loan.notes">
          <dt class="text-caption font-semibold text-argent-600">
            Remarques
          </dt>
          <dd class="whitespace-pre-line text-sable-600">
            {{ loan.notes }}
          </dd>
        </div>
      </dl>
      <div class="flex flex-col gap-2">
        <UiButton
          v-if="canCheckOut"
          ref="checkoutTrigger"
          size="lg"
          block
          @click="checkout.ask"
        >
          <ArrowRightLeft :size="17" />
          Préparer la sortie
        </UiButton>
        <UiButton
          v-if="canReopen"
          ref="reopenTrigger"
          variant="secondary"
          size="lg"
          block
          @click="reopening.ask"
        >
          <RotateCcw :size="17" />
          Rouvrir
        </UiButton>
        <div
          v-if="canEdit || loan.event"
          class="flex flex-wrap gap-2"
        >
          <UiButton
            v-if="canEdit"
            variant="secondary"
            class="flex-1"
            :to="editLoanPath(loan.id)"
          >
            <PencilLine :size="16" />
            {{ state === 'committee' ? 'Modifier la réservation' : 'Modifier' }}
          </UiButton>
          <UiButton
            v-if="loan.event"
            variant="secondary"
            class="flex-1"
            :to="eventPath(loan.event.id)"
          >
            <CalendarDays :size="16" />
            Voir l’événement
          </UiButton>
        </div>
        <div
          v-if="signed"
          class="flex flex-wrap gap-2"
        >
          <UiButton
            variant="secondary"
            class="flex-1"
            :to="agreementPath(loan.id)"
          >
            <FileText :size="16" />
            Bon de prêt à signer
          </UiButton>
          <UiButton
            variant="secondary"
            class="flex-1"
            :loading="depositing"
            @click="picker?.click()"
          >
            <FileUp :size="16" />
            {{ loan.agreement ? 'Remplacer la convention signée' : 'Déposer la convention signée' }}
          </UiButton>
          <input
            ref="picker"
            type="file"
            class="sr-only"
            tabindex="-1"
            aria-hidden="true"
            :accept="DOCUMENT_TYPES"
            @change="deposit"
          >
        </div>
        <p
          v-if="depositFailure"
          role="alert"
          class="text-sm text-ambre-800"
        >
          {{ depositFailure }}
        </p>
        <NuxtLink
          v-if="signed && loan.agreement"
          :to="documentLocation(loan.agreement.id)"
          class="flex items-center gap-2 text-sm text-azur-600 hover:text-azur-700"
        >
          <FileCheck :size="16" />
          {{ agreementText }}
        </NuxtLink>
        <UiButton
          v-if="canCancel"
          ref="cancelTrigger"
          variant="link"
          class="self-start"
          @click="cancelling.ask"
        >
          {{ state === 'committee' ? 'Annuler la réservation' : 'Annuler le prêt' }}
        </UiButton>
      </div>
      <UiConfirmation
        v-if="checkout.confirming.value"
        question="Le matériel de ce prêt sort maintenant ?"
        action="Confirmer la sortie"
        :pending="checkout.pending.value"
        :failure="checkout.failure.value"
        @confirm="confirmCheckout"
        @cancel="checkout.dismiss"
      />
      <UiConfirmation
        v-if="reopening.confirming.value"
        question="Rouvrir ce prêt ? Le matériel sera de nouveau compté comme sorti."
        action="Rouvrir le prêt"
        :pending="reopening.pending.value"
        :failure="reopening.failure.value"
        @confirm="confirmReopen"
        @cancel="reopening.dismiss"
      />
      <UiConfirmation
        v-if="cancelling.confirming.value"
        :question="cancelQuestion"
        action="Confirmer l’annulation"
        :pending="cancelling.pending.value"
        :failure="cancelling.failure.value"
        @confirm="confirmCancel"
        @cancel="cancelling.dismiss"
      />
    </div>
  </section>
  <BoardLoadError
    v-else-if="error"
    :message="error.message"
    @retry="refresh()"
  />
</template>
