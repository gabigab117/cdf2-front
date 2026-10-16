<script setup lang="ts">
import { Clock, Sparkles } from '@lucide/vue'

// The treasury assistant, its computed part (6.2): the receipts missing, the
// oldest asked for by e-mail, and the invoices to pay. Its conversation comes
// with the assistant (phase 9).
const { data: overview } = useBoardOverview()

const { amount } = useMoneyFormat()
const { calendarInWords } = useDateFormat()
const now = useNow()

const receipts = computed(() => overview.value?.pending.receipts ?? null)
const oldest = computed(() => receipts.value?.items[0] ?? null)
const missingText = computed(() => {
  const count = receipts.value?.count ?? 0
  if (count === 0 || !oldest.value) return 'Tous les justificatifs sont joints.'
  const lead = count === 1 ? '1 justificatif manquant :' : `${count} justificatifs manquants, dont :`
  return `${lead} ${inSentence(oldest.value.label)} (${amount(oldest.value.amount)}).`
})

const invoices = computed(() => overview.value?.pending.invoices ?? null)
const invoiceTexts = computed(() =>
  (invoices.value?.items ?? []).map((invoice) => {
    const priced = invoice.amount === null ? '' : ` (${amount(invoice.amount)})`
    // An invoice of no supplier is named by its title: « Facture — Bonbons ».
    const name = `${invoice.issuer ? `Facture ${invoice.issuer}` : invoice.title}${priced}`
    if (invoice.due_date === null) return { id: invoice.id, text: `${name} à régler.` }
    const day = calendarInWords(invoice.due_date, now.value)
    return { id: invoice.id, text: invoice.overdue ? `${name} à régler : échéance du ${day} dépassée.` : `${name} à régler avant le ${day}.` }
  }),
)
const otherInvoices = computed(() => {
  const others = (invoices.value?.count ?? 0) - invoiceTexts.value.length
  if (others < 1) return null
  return others === 1 ? 'Et 1 autre facture à régler.' : `Et ${others} autres factures à régler.`
})
</script>

<template>
  <section
    aria-labelledby="treasury-assistant"
    class="flex flex-col overflow-hidden rounded-card bg-sable-900 text-white"
  >
    <div class="flex items-center gap-2.5 border-b border-sable-750 px-5 py-4.5">
      <span
        class="inline-flex size-8 items-center justify-center rounded-control bg-azur-600"
        aria-hidden="true"
      >
        <Sparkles :size="17" />
      </span>
      <h2
        id="treasury-assistant"
        class="text-base font-semibold"
      >
        Assistant trésorerie
      </h2>
    </div>
    <div class="flex flex-col gap-3 px-5 py-4.5">
      <div class="flex gap-3">
        <span
          class="mt-0.75 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ambre-nuit text-xs font-bold text-ambre-400"
          aria-hidden="true"
        >!</span>
        <div class="flex flex-col items-start gap-1.5">
          <p class="text-sm">
            {{ missingText }}
          </p>
          <TreasuryFollowUp
            v-if="oldest"
            :entry="oldest"
            variant="dark"
          />
        </div>
      </div>
      <div
        v-for="invoice in invoiceTexts"
        :key="invoice.id"
        class="flex gap-3"
      >
        <span
          class="mt-0.75 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-azur-nuit text-azur-300"
          aria-hidden="true"
        >
          <Clock
            :size="12"
            :stroke-width="2.4"
          />
        </span>
        <p class="text-sm">
          {{ invoice.text }}
        </p>
      </div>
      <p
        v-if="otherInvoices"
        class="pl-8 text-sm text-argent-400"
      >
        {{ otherInvoices }}
      </p>
      <p
        v-if="invoiceTexts.length === 0"
        class="pl-8 text-sm text-argent-400"
      >
        Aucune facture à régler.
      </p>
    </div>
  </section>
</template>
