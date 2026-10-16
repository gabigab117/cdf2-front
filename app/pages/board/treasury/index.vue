<script setup lang="ts">
import type { EntryFields, LedgerFilter } from '~/utils/treasury'

definePageMeta({ path: '/bureau/tresorerie' })

useHead({ title: 'Trésorerie' })

const route = useRoute()
const now = useNow()
const query = computed(() => parseTreasuryQuery(route.query))
const year = computed(() => shownYear(query.value, now.value))

const { data: results, refresh: refreshResults } = useTreasuryResults(() => year.value)
const { data: page, status, error, refresh: refreshEntries } = useLedgerEntries(() => ({
  year: year.value,
  filter: query.value.filter,
  page: 1,
  size: LATEST_LINES,
}))

const { amount, signed } = useMoneyFormat()
const { recordEntry } = useTreasuryWrites()

const totals = computed(() => results.value?.totals ?? null)
const span = computed(() => yearSpan(year.value, now.value))
const newLine = computed(() => newEntryFields('expense', parisDate(now.value)))
// The line just recorded, shown in azur as in the mockup.
const highlighted = ref<number | null>(null)

function location(filter: LedgerFilter) {
  return filterLocation(query.value, filter)
}

const ledgerLink = computed(() => ledgerLocation(LEDGER_PATH, { ...query.value, page: 1 }))

// A line recorded shows first in the journal of its year, the filter left out.
async function record(fields: EntryFields, receipt: File | null) {
  const result = await recordEntry(fields, receipt)
  if (result.errors) return result.errors
  highlighted.value = result.data.id
  await navigateTo(yearLocation(Number(result.data.date.slice(0, 4))))
  void refreshResults()
  void refreshEntries()
  return null
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-3.5">
        <BoardPageTitle>Trésorerie</BoardPageTitle>
        <TreasuryYearSelect
          :year
          :years="results?.years ?? []"
          :location="yearLocation"
        />
      </div>
      <p class="text-lead text-argent-600">
        Un seul journal de recettes et de dépenses. Chaque ligne peut être rattachée à un événement.
      </p>
    </div>
    <div class="grid grid-cols-kpis gap-3.5">
      <UiKpiCard
        label="Recettes"
        :value="amount(totals?.income ?? null)"
        figure="amount"
        accent
      >
        {{ span }}
      </UiKpiCard>
      <UiKpiCard
        label="Dépenses"
        :value="amount(totals?.expense ?? null)"
        figure="amount"
      >
        {{ span }}
      </UiKpiCard>
      <UiKpiCard
        label="Résultat de l’exercice"
        :value="signed(totals?.result ?? null)"
        figure="amount"
        tone="dark"
      >
        Recettes moins dépenses
      </UiKpiCard>
    </div>
    <TreasuryEntryForm
      :id="NEW_LINE_ANCHOR"
      class="scroll-mt-20"
      title="Nouvelle ligne"
      :initial="newLine"
      :save="record"
      clears-after-save
      attachable
    />
    <div class="flex flex-wrap items-start gap-5">
      <TreasuryLedger
        class="min-w-0 flex-1 basis-155"
        :year
        :results="results ?? null"
        :page="page ?? null"
        :filter="query.filter"
        :location
        :error="error?.message ?? null"
        :loading="status === 'pending'"
        :highlighted
        @retry="refreshEntries()"
      >
        <NuxtLink
          :to="ledgerLink"
          class="block border-t border-argent-100 px-5.5 py-3.5 text-sm font-medium text-azur-600 hover:text-azur-700"
        >
          Voir tout le journal de l’exercice
        </NuxtLink>
      </TreasuryLedger>
      <div class="flex min-w-0 flex-1 basis-85 flex-col gap-5 md:max-w-105">
        <TreasuryEventResults
          :results="results ?? null"
          :filter="query.filter"
          :location
        />
        <TreasuryAssistant />
      </div>
    </div>
  </div>
</template>
