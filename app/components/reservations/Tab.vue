<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type EventOut = components['schemas']['EventOut']
type ReservationIn = components['schemas']['ReservationIn']

// The « Réservations » tab of an event (D1): its figures, its types of place
// and capacity, the form of a new reservation, then the reservations.
const { event, page } = defineProps<{
  event: EventOut
  /** The page of the reservations the address asks for. */
  page: number
}>()

const { data: stats, error, refresh } = useReservationStats(event.id)
const { createReservation } = useReservationWrites(event.id)

const table = useTemplateRef<{ refresh: () => Promise<void> }>('table')

function create(payload: ReservationIn): Promise<FormErrors | null> {
  return createReservation(payload)
}

// Every write changes the figures, and the count of the tab; a new
// reservation also shows in the table.
async function changed(): Promise<void> {
  await Promise.all([refresh(), refreshEventDashboard(event.id)])
}

async function created(): Promise<void> {
  await Promise.all([changed(), table.value?.refresh()])
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <template v-else-if="stats">
      <ReservationsStats :stats />
      <ReservationsTicketTypes
        :event-id="event.id"
        :stats
        class="max-w-4xl"
        @changed="changed"
      />
      <UiCard
        title="Nouvelle réservation"
        class="max-w-4xl"
      >
        <ReservationsForm
          v-if="stats.ticket_types.length > 0"
          :ticket-types="stats.ticket_types"
          :initial="reservationFields(stats.ticket_types)"
          action="Enregistrer la réservation"
          :save="create"
          @saved="created"
        />
        <p
          v-else
          class="text-sm text-argent-600"
        >
          Créez d’abord un type de place pour saisir des réservations.
        </p>
      </UiCard>
      <ReservationsTable
        ref="table"
        :event
        :stats
        :page
        @changed="changed"
      />
    </template>
  </div>
</template>
