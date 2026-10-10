<script setup lang="ts">
import type { components } from '~/types/api'

type ReservationStatsOut = components['schemas']['ReservationStatsOut']

// The figures of the reservations, as the API counts them: none is counted here.
const { stats } = defineProps<{ stats: ReservationStatsOut }>()

const shares = computed(() => seatShares(stats.ticket_types))
const scale = computed(() => stats.capacity ?? stats.seats)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-kpis gap-4">
      <UiKpiCard
        label="Réservations"
        :value="String(stats.reservations)"
      />
      <UiKpiCard
        label="Places réservées"
        :value="seatsTaken(stats)"
      />
      <UiKpiCard
        v-if="stats.remaining !== null"
        label="Restantes"
        :value="String(stats.remaining)"
      />
    </div>
    <UiCard
      v-if="stats.ticket_types.length > 0"
      title="Places par type"
    >
      <UiStackedBar
        :segments="shares"
        :total="scale"
        label="Places réservées"
        legend
      />
    </UiCard>
  </div>
</template>
