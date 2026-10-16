<script setup lang="ts">
import type { LedgerFilter } from '~/utils/treasury'

definePageMeta({ path: '/bureau/tresorerie/journal' })

useHead({ title: 'Journal de la trésorerie' })

const route = useRoute()
const now = useNow()
const query = computed(() => parseTreasuryQuery(route.query))
const year = computed(() => shownYear(query.value, now.value))

const { data: results } = useTreasuryResults(() => year.value)
const { data: page, status, error, refresh } = useLedgerEntries(() => ({
  year: year.value,
  filter: query.value.filter,
  page: query.value.page,
  size: LEDGER_PAGE_SIZE,
}))

const pageCount = computed(() => Math.ceil((page.value?.count ?? 0) / LEDGER_PAGE_SIZE))
const breadcrumb = computed(() => [
  { label: 'Trésorerie', to: ledgerLocation(TREASURY_PATH, { ...query.value, filter: null, page: 1 }) },
  { label: 'Journal' },
])

function location(filter: LedgerFilter) {
  return filterLocation(query.value, filter)
}

function pageLocation(target: number) {
  return { query: treasuryQuery({ ...query.value, page: target }) }
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <div class="flex flex-wrap items-center gap-3.5">
      <BoardPageTitle>Journal</BoardPageTitle>
      <TreasuryYearSelect
        :year
        :years="results?.years ?? []"
        :location="yearLocation"
      />
    </div>
    <TreasuryLedger
      :year
      :results="results ?? null"
      :page="page ?? null"
      :filter="query.filter"
      :location
      :error="error?.message ?? null"
      :loading="status === 'pending'"
      @retry="refresh()"
    >
      <UiPagination
        class="px-5.5 pt-2 pb-4"
        :page="query.page"
        :page-count
        :to="pageLocation"
      />
    </TreasuryLedger>
  </div>
</template>
