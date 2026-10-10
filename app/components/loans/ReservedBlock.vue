<script setup lang="ts">
// The « Matériel réservé » block of an event, from its dashboard: the
// equipment the committee keeps for it, blocked for the loans over its days.
// It shows nothing while the event keeps none.
const { eventId } = defineProps<{ eventId: number }>()

const { data: dashboard, error } = useEventDashboard(eventId)
const { calendarPeriod } = useDateFormat()
const now = useNow()

const look = LOAN_STATES.committee
const reservation = computed(() => (error.value ? null : dashboard.value?.committee_loan ?? null))
const period = computed(() => {
  const kept = reservation.value
  if (!kept) return ''
  const days = calendarPeriod(kept.start_date, kept.end_date, now.value)
  return `${days.charAt(0).toUpperCase()}${days.slice(1)} · bloqué pour les prêts`
})
</script>

<template>
  <section
    v-if="reservation"
    aria-labelledby="reserved-equipment"
    class="overflow-hidden rounded-tile border border-argent-200 bg-white"
  >
    <header class="flex flex-col gap-1 border-b border-argent-100 px-5 py-4.5">
      <div class="flex flex-wrap items-center gap-2.5">
        <h2
          id="reserved-equipment"
          class="text-base font-semibold"
        >
          Matériel réservé
        </h2>
        <UiStatusPill
          :tone="look.tone"
          size="sm"
        >
          {{ look.label }}
        </UiStatusPill>
      </div>
      <p class="text-note text-argent-600">
        {{ period }}
      </p>
    </header>
    <ul class="flex flex-col divide-y divide-argent-100 px-5">
      <li
        v-for="line in reservation.lines"
        :key="line.id"
        class="flex justify-between gap-2.5 py-2.5 text-ui"
      >
        <span>{{ line.equipment.name }}</span>
        <span class="font-mono font-semibold">× {{ line.quantity }}</span>
      </li>
    </ul>
    <div class="px-5 pt-1 pb-5">
      <UiButton
        variant="secondary"
        block
        :to="editLoanPath(reservation.id)"
      >
        Modifier la réservation
      </UiButton>
    </div>
  </section>
</template>
