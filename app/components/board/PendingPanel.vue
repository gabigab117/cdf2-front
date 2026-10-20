<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type PendingOut = components['schemas']['PendingOut']

// The « À traiter » panel the bell opens (A6): what awaits the board, each item
// leading to where it is dealt with. The documents to review, the loans late or
// to prepare, then what the treasury leaves to do: the receipts missing, the
// invoices to pay and the advances to pay back; last, the items of the stock
// below their threshold.
const { pending } = defineProps<{ pending: PendingOut | null }>()

const { amount } = useMoneyFormat()
const { quantity } = useQuantityFormat()
const { calendarDay, calendarWeekday } = useDateFormat()
const now = useNow()

const total = computed(() => pending?.total ?? 0)

const documents = computed(() =>
  (pending?.documents.items ?? []).map(document => ({
    key: document.id,
    to: documentLocation(document.id),
    title: document.title,
    line: `${DOCUMENT_CATEGORIES[document.category].label} · ${calendarDay(document.date, now.value)}`,
  })),
)
const documentsCount = computed(() => pending?.documents.counts.total ?? 0)
// The panel lists the latest: the count leads to them all.
const allDocuments = computed(() => seeAll(documentsCount.value, documents.value.length, 'documents à vérifier', TO_REVIEW_LOCATION))

// The loans late, then those to prepare, under their own titles.
const loans = computed(() =>
  (pending?.loans.items ?? []).map(loan => ({
    state: loan.state,
    key: loan.id,
    to: loanLocation(loan.id),
    title: loanTitle(loan),
    line: loanHeadline(loan, parisDate(now.value), date => calendarWeekday(date, now.value)),
  })),
)
const loansCount = computed(() => (pending ? pending.loans.overdue + pending.loans.to_prepare : 0))
const loanSections = computed(() => {
  const sections = [
    { id: 'pending-overdue-loans', title: 'Prêts en retard', items: loans.value.filter(loan => loan.state === 'overdue') },
    { id: 'pending-loans-to-prepare', title: 'Prêts à préparer', items: loans.value.filter(loan => loan.state === 'to_prepare') },
  ].filter(section => section.items.length > 0)
  const more = seeAll(loansCount.value, loans.value.length, 'prêts à traiter', LOANS_PATH)
  // The link to them all follows the last of their sections.
  return sections.map((section, index) => ({ ...section, more: index === sections.length - 1 ? more : null }))
})

// The expenses missing their receipt, the oldest first.
const receipts = computed(() =>
  (pending?.receipts.items ?? []).map(entry => ({
    key: entry.id,
    to: entryPath(entry.id),
    title: entry.label,
    line: [calendarDay(entry.date, now.value), amount(entry.amount), entry.contact && memberShortName(entry.contact)].filter(Boolean).join(' · '),
  })),
)
const allReceipts = computed(() =>
  seeAll(pending?.receipts.count ?? 0, receipts.value.length, 'justificatifs manquants', pendingEntriesLocation('receipts')))

// The advances the committee owes its members, the oldest first.
const advances = computed(() =>
  (pending?.advances.items ?? []).map(entry => ({
    key: entry.id,
    to: entryPath(entry.id),
    title: entry.label,
    line: [calendarDay(entry.date, now.value), amount(entry.amount), memberSignature(entry.advanced_by)].join(' · '),
  })),
)
const allAdvances = computed(() =>
  seeAll(pending?.advances.count ?? 0, advances.value.length, 'avances à rembourser', pendingEntriesLocation('advances')))

// The invoices to pay, the first due first.
const invoices = computed(() =>
  (pending?.invoices.items ?? []).map(invoice => ({
    key: invoice.id,
    to: documentLocation(invoice.id),
    title: invoice.issuer || invoice.title,
    line: [invoice.amount === null ? null : amount(invoice.amount), dueText(invoice)].filter(Boolean).join(' · '),
  })),
)
const otherInvoices = computed(() => {
  const others = (pending?.invoices.count ?? 0) - invoices.value.length
  if (others < 1) return null
  return { label: `Et ${countText(others, 'autre facture', 'autres factures')}` }
})

// The items of the stock below their threshold, in the stock's order: each
// leads to the stock, where its − and + are.
const lowItems = computed(() =>
  (pending?.stock.items ?? []).map(item => ({
    key: item.id,
    to: LOW_STOCK_LOCATION,
    title: item.name,
    line: `${quantity(item.quantity, item.unit)} en stock, seuil ${quantity(item.threshold, item.unit)}`,
  })),
)
const allLowItems = computed(() => seeAll(pending?.stock.count ?? 0, lowItems.value.length, 'articles sous le seuil', LOW_STOCK_LOCATION))

// « Voir les 12 documents à vérifier »: the link to them all, when the panel lists fewer.
function seeAll(count: number, listed: number, what: string, to: RouteLocationRaw) {
  return count > listed ? { label: `Voir les ${count} ${what}`, to } : null
}

function dueText({ due_date, overdue }: { due_date: string | null, overdue: boolean }): string {
  if (due_date === null) return 'sans échéance'
  const day = calendarDay(due_date, now.value)
  return overdue ? `échéance dépassée le ${day}` : `avant le ${day}`
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <h2 class="px-3 pt-2 pb-1 text-title font-semibold">
      À traiter
    </h2>
    <p
      v-if="total === 0"
      class="px-3 pb-3 text-sm text-argent-600"
    >
      Rien à traiter pour l’instant.
    </p>
    <BoardPendingSection
      v-if="documents.length > 0"
      id="pending-documents"
      title="Documents à vérifier"
      :items="documents"
      :more="allDocuments"
    />
    <BoardPendingSection
      v-for="section in loanSections"
      :id="section.id"
      :key="section.id"
      :title="section.title"
      :items="section.items"
      :more="section.more"
    />
    <BoardPendingSection
      v-if="receipts.length > 0"
      id="pending-receipts"
      title="Justificatifs manquants"
      :items="receipts"
      :more="allReceipts"
    />
    <BoardPendingSection
      v-if="invoices.length > 0"
      id="pending-invoices"
      title="Factures à régler"
      :items="invoices"
      :more="otherInvoices"
    />
    <BoardPendingSection
      v-if="advances.length > 0"
      id="pending-advances"
      title="Avances à rembourser"
      :items="advances"
      :more="allAdvances"
    />
    <BoardPendingSection
      v-if="lowItems.length > 0"
      id="pending-stock"
      title="Stock bas"
      :items="lowItems"
      :more="allLowItems"
    />
  </div>
</template>
