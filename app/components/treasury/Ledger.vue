<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'
import type { LedgerFilter } from '~/utils/treasury'

type FiscalYearResultsOut = components['schemas']['FiscalYearResultsOut']
type PagedLedgerEntryOut = components['schemas']['PagedLedgerEntryOut']

// The journal of a fiscal year: its chips, its lines, and what follows them, the
// link to the whole journal or the pages.
const { year, results, page, filter, location, error = null, loading = false, highlighted = null } = defineProps<{
  year: number
  /** The fiscal year's results, which count the lines of each chip. */
  results: FiscalYearResultsOut | null
  /** The page of lines the filter keeps, and how many it keeps in all. */
  page: PagedLedgerEntryOut | null
  filter: LedgerFilter
  /** The address of the journal with another filter. */
  location: (filter: LedgerFilter) => RouteLocationRaw
  /** Why the lines could not load. */
  error?: string | null
  loading?: boolean
  /** The line just recorded. */
  highlighted?: number | null
}>()

const emit = defineEmits<{ retry: [] }>()

// All, the general running, then each event that has lines, the first to start first.
const chips = computed(() => [
  { label: 'Toutes', filter: null, count: results?.totals.count },
  { label: GENERAL_LABEL, filter: 'general' as const, count: results?.general.count },
  ...(results?.events ?? []).map(result => ({ label: result.event.title, filter: result.event.id, count: result.count })),
])
const entries = computed(() => page?.items ?? [])
const countText = computed(() => {
  const count = page?.count ?? 0
  return `${count} ${count < 2 ? 'ligne' : 'lignes'}`
})
</script>

<template>
  <UiCard
    flush
    :aria-busy="loading || undefined"
  >
    <div class="flex flex-col gap-3.5 border-b border-argent-100 px-5.5 py-4.5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-title font-semibold">
          Journal
        </h2>
        <span class="text-note text-argent-600">{{ countText }}</span>
      </div>
      <nav
        aria-label="Filtrer par événement"
        class="flex flex-wrap gap-1.5"
      >
        <UiFilterChip
          v-for="chip in chips"
          :key="String(chip.filter)"
          size="sm"
          :pressed="chip.filter === filter"
          :count="chip.count"
          :to="location(chip.filter)"
        >
          {{ chip.label }}
        </UiFilterChip>
      </nav>
    </div>
    <BoardLoadError
      v-if="error"
      class="m-5.5"
      :message="error"
      @retry="emit('retry')"
    />
    <TreasuryLedgerTable
      v-else-if="entries.length > 0"
      :entries
      :highlighted
    />
    <UiEmptyState v-else-if="!loading">
      Aucune ligne pour l’exercice {{ year }}.
    </UiEmptyState>
    <slot />
  </UiCard>
</template>
