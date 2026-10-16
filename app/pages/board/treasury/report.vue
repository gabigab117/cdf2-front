<script setup lang="ts">
import { Printer } from '@lucide/vue'
import type { components } from '~/types/api'

type LedgerCategoryTotalOut = components['schemas']['LedgerCategoryTotalOut']
type LedgerTotalsOut = components['schemas']['LedgerTotalsOut']

definePageMeta({ path: '/bureau/tresorerie/bilan', topBarAction: true })

// Printed, the sheet fills an A4 page, without the margins where the browser
// writes the address and the date: a rule of this page alone, gone with it.
useHead({ title: 'Bilan pour l’AG', style: [{ textContent: '@page { size: A4; margin: 0; }' }] })

// The report of a fiscal year for the general meeting (6.6): its totals, the
// result of each event, what each category brought in or cost, and the
// receipts it misses. Every figure is the API's.
const RESULT_COLUMNS = [{ label: 'Recettes', amount: true }, { label: 'Dépenses', amount: true }, { label: 'Résultat', amount: true }]
const EVENT_COLUMNS = [{ label: 'Événement' }, ...RESULT_COLUMNS]
const CATEGORY_COLUMNS = [{ label: 'Catégorie' }, { label: 'Lignes', amount: true }, { label: 'Montant', amount: true }]
const MISSING_COLUMNS = [{ label: 'Date' }, { label: 'Libellé' }, { label: 'Événement' }, { label: 'Montant', amount: true }]

const route = useRoute()
const now = useNow()
const query = computed(() => parseTreasuryQuery(route.query))
const year = computed(() => shownYear(query.value, now.value))

const { data: report, error, refresh } = useTreasuryReport(() => year.value)
const { amount, signed } = useMoneyFormat()
const { calendarNumeric } = useDateFormat()

const today = computed(() => calendarNumeric(parisDate(now.value)))
const breadcrumb = computed(() => [
  { label: 'Trésorerie', to: ledgerLocation(TREASURY_PATH, { year: query.value.year, filter: null, page: 1 }) },
  { label: 'Bilan pour l’AG' },
])
// The current fiscal year is stopped at today; a past one runs to its end.
const span = computed(() => (year.value === parisCalendar(now.value).year
  ? `Arrêté au ${today.value}`
  : `Du 1er janvier au 31 décembre ${year.value}`))

const totals = computed(() => (report.value ? [{ key: 'totals', cells: results(report.value.totals) }] : []))
const events = computed(() => {
  const shown = report.value
  if (!shown) return []
  return [
    ...shown.events.map(result => ({ key: result.event.id, cells: [result.event.title, ...results(result)] })),
    ...(shown.general.count > 0 ? [{ key: 'general', cells: [GENERAL_LABEL, ...results(shown.general)] }] : []),
  ]
})
const eventsTotal = computed(() => (report.value ? ['Total', ...results(report.value.totals)] : null))
const incomes = computed(() => categories(report.value?.income_categories ?? []))
const expenses = computed(() => categories(report.value?.expense_categories ?? []))
const incomesTotal = computed(() => (report.value ? ['Total', '', amount(report.value.totals.income)] : null))
const expensesTotal = computed(() => (report.value ? ['Total', '', amount(report.value.totals.expense)] : null))
const missing = computed(() =>
  (report.value?.missing_receipts ?? []).map(entry => ({
    key: entry.id,
    cells: [calendarNumeric(entry.date), entry.label, entry.event?.title ?? GENERAL_LABEL, amount(entry.amount)],
  })),
)

function results({ income, expense, result }: Pick<LedgerTotalsOut, 'income' | 'expense' | 'result'>): string[] {
  return [amount(income), amount(expense), signed(result)]
}

function categories(totals: readonly LedgerCategoryTotalOut[]) {
  return totals.map(total => ({ key: total.category, cells: [CATEGORY_LABELS[total.category], String(total.count), amount(total.total)] }))
}

function print(): void {
  window.print()
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <Teleport
      defer
      to="#board-top-bar-action"
    >
      <BoardTopBarButton
        v-if="report"
        :icon="Printer"
        label="Imprimer / Enregistrer en PDF"
        @click="print"
      />
    </Teleport>
    <UiBreadcrumb
      class="print:hidden"
      :items="breadcrumb"
      back
    />
    <div
      v-if="report"
      class="overflow-x-auto print:overflow-visible"
    >
      <article
        aria-label="Bilan pour l’AG"
        class="mx-auto flex a4-sheet flex-col gap-1.5 bg-white leading-tight text-sable-950 shadow-sheet print:min-h-0 print:shadow-none"
      >
        <header class="flex flex-col gap-0.5 border-b-2 border-sable-950 pb-1.5 text-center">
          <p class="text-sm font-semibold uppercase">
            {{ SITE_NAME }}
          </p>
          <h1 class="text-lg font-bold uppercase">
            Bilan financier de l’exercice {{ report.year }}
          </h1>
          <p class="text-xs">
            {{ span }}
          </p>
        </header>
        <TreasuryReportSection title="Résultat de l’exercice">
          <TreasuryReportTable
            :columns="RESULT_COLUMNS"
            :rows="totals"
          />
        </TreasuryReportSection>
        <TreasuryReportSection title="Résultat par événement">
          <TreasuryReportTable
            v-if="events.length > 0"
            :columns="EVENT_COLUMNS"
            :rows="events"
            :total="eventsTotal"
          />
          <p
            v-else
            class="text-caption"
          >
            Aucune ligne pour cet exercice.
          </p>
        </TreasuryReportSection>
        <TreasuryReportSection title="Recettes par catégorie">
          <TreasuryReportTable
            v-if="incomes.length > 0"
            :columns="CATEGORY_COLUMNS"
            :rows="incomes"
            :total="incomesTotal"
          />
          <p
            v-else
            class="text-caption"
          >
            Aucune recette pour cet exercice.
          </p>
        </TreasuryReportSection>
        <TreasuryReportSection title="Dépenses par catégorie">
          <TreasuryReportTable
            v-if="expenses.length > 0"
            :columns="CATEGORY_COLUMNS"
            :rows="expenses"
            :total="expensesTotal"
          />
          <p
            v-else
            class="text-caption"
          >
            Aucune dépense pour cet exercice.
          </p>
        </TreasuryReportSection>
        <TreasuryReportSection title="Justificatifs manquants">
          <TreasuryReportTable
            v-if="missing.length > 0"
            :columns="MISSING_COLUMNS"
            :rows="missing"
          />
          <p
            v-else
            class="text-caption"
          >
            Tous les justificatifs sont joints.
          </p>
        </TreasuryReportSection>
        <p class="mt-3 text-right text-xs text-sable-600">
          Édité le {{ today }} depuis l’espace du bureau.
        </p>
      </article>
    </div>
    <BoardLoadError
      v-else-if="error"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
