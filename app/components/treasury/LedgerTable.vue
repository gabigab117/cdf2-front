<script setup lang="ts">
import { Paperclip } from '@lucide/vue'
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// The lines of the journal: each leads to its page.
const { entries, highlighted = null } = defineProps<{
  entries: readonly LedgerEntryOut[]
  /** The line just recorded, shown in azur as in the mockup. */
  highlighted?: number | null
}>()

const { calendarDay } = useDateFormat()
const now = useNow()

const COLUMNS = 'grid-cols-ledger-narrow md:grid-cols-ledger'

const rows = computed(() => entries.map(entry => ({ entry, reimbursement: reimbursement(entry) })))

// Under « Avancé par Julie R. »: « À rembourser », in amber, or the day the
// advance was paid back.
function reimbursement(entry: LedgerEntryOut): { text: string, owed: boolean } | null {
  if (entry.payment_method !== 'advance') return null
  if (entry.reimbursed_on === null) return { text: 'À rembourser', owed: true }
  return { text: `Remboursée le ${calendarDay(entry.reimbursed_on, now.value)}`, owed: false }
}
</script>

<template>
  <div>
    <div
      class="grid items-center gap-3 border-b border-argent-100 bg-argent-25 px-5.5 py-2.5 text-xs font-semibold tracking-table text-argent-600 uppercase"
      :class="COLUMNS"
      aria-hidden="true"
    >
      <span>Date</span>
      <span>Libellé</span>
      <span class="max-md:hidden">Événement</span>
      <span class="max-md:hidden">Paiement</span>
      <span class="text-right">Montant</span>
      <span class="text-center">Just.</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="{ entry, reimbursement: paidBack } in rows"
        :key="entry.id"
      >
        <UiSelectableRow
          :selected="false"
          :to="entryPath(entry.id)"
        >
          <span
            class="grid items-center gap-3 px-5.5 py-3 text-sm"
            :class="[COLUMNS, { 'bg-azur-50': entry.id === highlighted }]"
          >
            <span class="text-argent-600">{{ calendarDay(entry.date, now) }}</span>
            <span class="flex min-w-0 flex-col leading-snug">
              <span class="truncate font-medium text-sable-950">{{ entry.label }}</span>
              <span class="text-caption text-argent-600">{{ CATEGORY_LABELS[entry.category] }}</span>
            </span>
            <span class="min-w-0 max-md:hidden">
              <span
                v-if="entry.event"
                class="inline-block h-6.5 max-w-full truncate rounded-full bg-azur-100 px-2.5 text-caption leading-6.5 font-semibold text-azur-700"
              >{{ entry.event.title }}</span>
              <span
                v-else
                class="text-label text-argent-600"
              >{{ GENERAL_LABEL }}</span>
            </span>
            <span class="flex min-w-0 flex-col leading-snug max-md:hidden">
              <span class="truncate text-note text-sable-600">{{ paymentText(entry) }}</span>
              <span
                v-if="paidBack"
                class="text-caption"
                :class="paidBack.owed ? 'font-semibold text-ambre-700' : 'text-argent-600'"
              >{{ paidBack.text }}</span>
            </span>
            <TreasuryAmount
              class="text-right"
              :entry
            />
            <span class="flex justify-center">
              <Paperclip
                v-if="entry.receipt_state === 'attached'"
                :size="16"
                role="img"
                :aria-label="RECEIPT_STATE_LABELS.attached"
                class="text-azur-600"
              />
              <span
                v-else-if="entry.receipt_state === 'missing'"
                role="img"
                :aria-label="RECEIPT_STATE_LABELS.missing"
                class="inline-flex size-5.5 items-center justify-center rounded-full bg-ambre-50 text-note font-bold text-ambre-700"
              >!</span>
              <span
                v-else
                role="img"
                :aria-label="RECEIPT_STATE_LABELS.not_required"
                class="text-argent-400"
              >—</span>
            </span>
          </span>
        </UiSelectableRow>
      </li>
    </ul>
  </div>
</template>
