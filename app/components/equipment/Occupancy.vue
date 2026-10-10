<script setup lang="ts">
// The loans that hold an equipment over the weeks to come, each a bar on the
// same track, with the line of today across them.
const { id } = defineProps<{ id: number }>()

const { data: occupancy, error, refresh } = useEquipmentOccupancy(id)
const { calendarDay, calendarPeriod } = useDateFormat()
const now = useNow()

const LEGEND = [
  { label: 'Prêt', tone: 'azur' },
  { label: 'Usage comité', tone: 'sable' },
  { label: 'Aujourd’hui', tone: 'ambre', shape: 'line' },
] as const

const range = computed(() => (occupancy.value ? { start: occupancy.value.start, end: occupancy.value.end } : null))
const title = computed(() => (range.value ? `Occupation jusqu’au ${calendarDay(range.value.end, now.value)}` : 'Occupation'))
const today = computed(() => (range.value ? dayPosition(range.value, parisDate(now.value)) : null))

// A label every other week, as the mockup spaces them.
const scale = computed(() => {
  const shown = range.value
  if (!shown) return []
  return weekStarts(shown, 2).map(day => ({ day, left: dayPosition(shown, day), label: calendarDay(day, now.value) }))
})

const rows = computed(() => {
  const shown = range.value
  if (!shown || !occupancy.value) return []
  return occupancy.value.loans.map(({ loan, quantity }) => {
    const committee = loan.borrower_type === 'committee'
    const days = calendarPeriod(loan.start_date, loan.end_date, now.value)
    return {
      id: loan.id,
      who: loan.display_name,
      quantity,
      dates: committee ? `${days} · usage comité` : days,
      placement: periodPlacement(shown, loan.start_date, loan.end_date),
      tone: committee ? 'bg-sable-950' : 'bg-azur-600',
    }
  })
})

const count = computed(() => {
  const loans = rows.value.length
  return `${loans} ${loans > 1 ? 'sorties prévues' : 'sortie prévue'}`
})
</script>

<template>
  <section class="-mx-6 flex flex-col gap-3.5 border-t border-argent-100 px-6 pt-5">
    <div class="flex items-center justify-between gap-2.5">
      <h3 class="text-sm font-semibold text-sable-950">
        {{ title }}
      </h3>
      <span
        v-if="occupancy && rows.length > 0"
        class="text-caption text-argent-600"
      >{{ count }}</span>
    </div>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <template v-else-if="occupancy">
      <div
        class="relative h-4.5 text-overline text-argent-600"
        aria-hidden="true"
      >
        <span
          v-for="tick in scale"
          :key="tick.day"
          class="absolute top-0 whitespace-nowrap"
          :style="{ left: tick.left ?? undefined }"
        >{{ tick.label }}</span>
      </div>
      <ul
        v-if="rows.length > 0"
        aria-label="Prêts et réservations"
        class="flex flex-col gap-3.5"
      >
        <li
          v-for="row in rows"
          :key="row.id"
          class="flex flex-col gap-1.5"
        >
          <span class="flex items-baseline justify-between gap-2.5 text-note">
            <span class="truncate font-medium text-sable-950">{{ row.who }}</span>
            <span class="shrink-0 font-mono font-semibold text-sable-950">× {{ row.quantity }}</span>
          </span>
          <span
            class="relative h-3 rounded-full bg-argent-150"
            aria-hidden="true"
          >
            <span
              v-if="today"
              class="absolute -inset-y-0.75 w-0.5 rounded-xs bg-ambre-500"
              :style="{ left: today }"
            />
            <span
              v-if="row.placement"
              class="absolute inset-y-0 rounded-full"
              :class="row.tone"
              :style="{ left: row.placement.left, width: row.placement.width }"
            />
          </span>
          <span class="text-caption text-argent-600">{{ row.dates }}</span>
        </li>
      </ul>
      <p
        v-else
        class="text-sm text-argent-600"
      >
        Aucun prêt ni réservation sur la période.
      </p>
      <UiLegend :items="LEGEND" />
    </template>
  </section>
</template>
