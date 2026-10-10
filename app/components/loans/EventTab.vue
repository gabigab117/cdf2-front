<script setup lang="ts">
import { Plus } from '@lucide/vue'

// The « Matériel » tab of an event: the equipment the committee keeps for it,
// or the way to keep some, which opens the loan form on the event.
const { eventId } = defineProps<{ eventId: number }>()

const { data: dashboard, error, refresh } = useEventDashboard(eventId)

const reserve = computed(() => ({ path: NEW_LOAN_PATH, query: { evenement: String(eventId) } }))
</script>

<template>
  <BoardLoadError
    v-if="error"
    :message="error.message"
    @retry="refresh()"
  />
  <div
    v-else-if="dashboard"
    class="max-w-xl"
  >
    <LoansReservedBlock
      v-if="dashboard.committee_loan"
      :event-id
    />
    <section
      v-else
      class="flex flex-col items-start gap-3.5 rounded-tile border border-argent-200 bg-white p-5"
    >
      <p class="text-sm text-argent-600">
        Aucun matériel n’est réservé pour cet événement. Une réservation bloque son matériel pour les prêts sur ses jours.
      </p>
      <UiButton :to="reserve">
        <Plus :size="16" />
        Réserver du matériel
      </UiButton>
    </section>
  </div>
</template>
