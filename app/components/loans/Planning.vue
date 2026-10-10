<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type LoanState = components['schemas']['LoanState']

// The planning of the loans (Prets.dc.html): a row a loan over nine weeks, its
// bar cut at the edges of the window, a rule each week and the line of today.
// A bar leads to the loan's panel.
const { location } = defineProps<{
  /** The address of a loan's panel, the list's own query kept. */
  location: (id: number) => RouteLocationRaw
}>()

const { data: planning, error, refresh } = useLoanPlanning()
const { calendarDay, calendarPeriod } = useDateFormat()
const now = useNow()

const LEGEND = [
  { label: 'Prêt', tone: 'azur' },
  { label: 'À préparer', tone: 'ambre' },
  { label: 'Usage comité', tone: 'sable' },
  { label: 'Rendu', tone: 'argent' },
] as const

// A loan to prepare in amber, the committee's in black, one returned in grey,
// any other in azur.
const classes = {
  bar: {
    to_prepare: 'bg-ambre-500 text-white',
    committee: 'bg-sable-950 text-white',
    returned: 'bg-argent-300 text-sable-800',
    other: 'bg-azur-600 text-white',
  },
  label: {
    returned: 'text-argent-600',
    other: 'text-sable-950',
  },
}

function barClass(state: LoanState): string {
  return state === 'to_prepare' || state === 'committee' || state === 'returned' ? classes.bar[state] : classes.bar.other
}

const range = computed(() => (planning.value ? { start: planning.value.start, end: planning.value.end } : null))
const today = computed(() => (range.value ? dayPosition(range.value, parisDate(now.value)) : null))
const weekStep = computed(() => (range.value ? weekShare(range.value) : '0%'))

const scale = computed(() => {
  const shown = range.value
  if (!shown) return []
  return weekStarts(shown).map(day => ({ day, left: dayPosition(shown, day) ?? '0%', label: calendarDay(day, now.value) }))
})

const rows = computed(() => {
  const shown = range.value
  if (!shown || !planning.value) return []
  return planning.value.loans.map(loan => ({
    id: loan.id,
    label: loan.display_name,
    labelClass: loan.state === 'returned' ? classes.label.returned : classes.label.other,
    text: loan.purpose || loan.display_name,
    name: `${loan.display_name}, ${calendarPeriod(loan.start_date, loan.end_date, now.value)}, ${LOAN_STATES[loan.state].label.toLowerCase()}`,
    placement: periodPlacement(shown, loan.start_date, loan.end_date),
    barClass: barClass(loan.state),
  }))
})
</script>

<template>
  <UiCard
    id="planning"
    flush
  >
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-argent-100 px-5.5 py-4.5">
      <h2 class="text-title font-semibold">
        Planning
      </h2>
      <UiLegend :items="LEGEND" />
    </div>
    <BoardLoadError
      v-if="error"
      class="m-5.5"
      :message="error.message"
      @retry="refresh()"
    />
    <div
      v-else-if="planning"
      class="overflow-x-auto"
    >
      <div class="flex min-w-160 flex-col gap-0.5 px-5.5 pt-3.5 pb-4.5">
        <div
          class="grid h-6 grid-cols-planning-narrow items-end gap-4 md:grid-cols-planning"
          aria-hidden="true"
        >
          <span />
          <span class="relative h-4.5 text-xs text-argent-600">
            <span
              v-for="tick in scale"
              :key="tick.day"
              class="absolute top-0 whitespace-nowrap"
              :style="{ left: tick.left }"
            >{{ tick.label }}</span>
          </span>
        </div>
        <ul
          v-if="rows.length > 0"
          aria-label="Prêts du planning"
        >
          <li
            v-for="row in rows"
            :key="row.id"
            class="grid h-9.5 grid-cols-planning-narrow items-center gap-4 md:grid-cols-planning"
          >
            <span
              class="truncate text-note font-medium"
              :class="row.labelClass"
            >{{ row.label }}</span>
            <span
              class="relative h-full week-grid"
              :style="{ backgroundSize: `${weekStep} 100%` }"
            >
              <span
                v-if="today"
                class="absolute inset-y-0 w-0.5 bg-ambre-500"
                aria-hidden="true"
                :style="{ left: today }"
              />
              <NuxtLink
                v-if="row.placement"
                :to="location(row.id)"
                :aria-label="row.name"
                :aria-current="undefined"
                class="absolute inset-y-2 flex items-center overflow-hidden rounded-lg px-2 text-xs font-semibold whitespace-nowrap"
                :class="row.barClass"
                :style="{ left: row.placement.left, width: row.placement.width }"
              >{{ row.text }}</NuxtLink>
            </span>
          </li>
        </ul>
        <p
          v-else
          class="py-4 text-sm text-argent-600"
        >
          Aucun prêt sur ces neuf semaines.
        </p>
      </div>
    </div>
  </UiCard>
</template>
