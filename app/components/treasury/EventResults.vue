<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'
import type { LedgerFilter } from '~/utils/treasury'

type FiscalYearResultsOut = components['schemas']['FiscalYearResultsOut']

// « Résultat par événement » (6.3): what each event that has lines brought in
// and cost, the first to start first, the general running last if it has lines
// too. Each pair of bars is drawn against the largest amount; a row filters the
// journal, and clicked again shows it whole.
const { results, filter, location } = defineProps<{
  results: FiscalYearResultsOut | null
  /** The filter of the journal the page shows. */
  filter: LedgerFilter
  /** The address of the journal with another filter. */
  location: (filter: LedgerFilter) => RouteLocationRaw
}>()

const { amount, signed } = useMoneyFormat()
const titleId = useId()

const LEGEND = [
  { label: 'Recettes', tone: 'azur' as const },
  { label: 'Dépenses', tone: 'argent' as const },
]

const classes = {
  row: 'grid w-full grid-cols-event-result items-center gap-x-3 gap-y-1.5 px-5 py-2.5 transition-colors',
  idle: 'hover:bg-argent-25',
  active: 'bg-azur-50',
  gain: 'text-azur-700',
  loss: 'text-ambre-700',
}

const rows = computed(() => {
  if (!results || results.totals.count === 0) return []
  const parts = [
    ...results.events.map(result => ({ key: String(result.event.id), name: result.event.title, filter: result.event.id as LedgerFilter, ...result })),
    ...(results.general.count > 0 ? [{ key: 'general', name: GENERAL_LABEL, filter: 'general' as LedgerFilter, ...results.general }] : []),
  ]
  // Above zero: every line has an amount above zero.
  const largest = Math.max(...parts.flatMap(part => [Number(part.income), Number(part.expense)]))
  return parts.map((part) => {
    const active = part.filter === filter
    return {
      key: part.key,
      name: part.name,
      result: signed(part.result),
      // What the bars draw, for screen readers.
      spoken: `Recettes ${amount(part.income)}, dépenses ${amount(part.expense)}`,
      resultClass: Number(part.result) >= 0 ? classes.gain : classes.loss,
      income: `${(Number(part.income) / largest) * 100}%`,
      expense: `${(Number(part.expense) / largest) * 100}%`,
      active,
      // Clicked again, the row shows the whole journal.
      to: location(active ? null : part.filter),
      rowClass: [classes.row, active ? classes.active : classes.idle],
    }
  })
})
</script>

<template>
  <UiCard
    flush
    :aria-labelledby="titleId"
  >
    <div class="flex flex-col gap-2.5 border-b border-argent-100 px-5 py-4.5">
      <h2
        :id="titleId"
        class="text-base font-semibold"
      >
        Résultat par événement
      </h2>
      <UiLegend :items="LEGEND" />
    </div>
    <ul
      v-if="rows.length > 0"
      class="flex flex-col py-1.5"
    >
      <li
        v-for="row in rows"
        :key="row.key"
      >
        <NuxtLink
          :to="row.to"
          :aria-current="row.active ? 'page' : undefined"
          :class="row.rowClass"
        >
          <span class="truncate text-sm font-medium text-sable-950">{{ row.name }}</span>
          <span
            class="text-right font-mono text-note font-semibold"
            :class="row.resultClass"
          >{{ row.result }}</span>
          <span class="sr-only">{{ row.spoken }}</span>
          <span
            class="col-span-full flex flex-col gap-0.75"
            aria-hidden="true"
          >
            <span
              class="h-1.75 rounded-r bg-azur-600"
              :style="{ width: row.income }"
            />
            <span
              class="h-1.75 rounded-r bg-argent-300"
              :style="{ width: row.expense }"
            />
          </span>
        </NuxtLink>
      </li>
    </ul>
    <UiEmptyState v-else>
      Aucune ligne pour cet exercice.
    </UiEmptyState>
  </UiCard>
</template>
