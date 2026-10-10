<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { StationFields } from '~/utils/stations'

type EventOut = components['schemas']['EventOut']

// The « Postes » tab of an event: how many volunteers stand at its stations,
// the stations themselves, and how the former committee staffed its own.
const { event } = defineProps<{ event: EventOut }>()

const { data: board, status, error, refresh } = useStationBoard(event.id)
const { createStation, reorderStations } = useStationWrites(event.id)

const stations = computed(() => board.value?.stations ?? [])
const loading = computed(() => status.value === 'pending')
const moveFailure = ref<string | null>(null)

function add(fields: StationFields): Promise<FormErrors | null> {
  return createStation(stationPayload(fields))
}

// Every write changes the stations' totals, and the count of their tab: both
// come again from the API, never counted here.
async function changed(): Promise<void> {
  await Promise.all([refresh(), refreshEventDashboard(event.id)])
}

async function move(index: number, step: -1 | 1): Promise<void> {
  moveFailure.value = await reorderStations(movedStation(stations.value.map(station => station.id), index, step))
  if (!moveFailure.value) await refresh()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <template v-else-if="board">
      <div
        v-if="stations.length > 0"
        class="flex flex-wrap gap-2"
        aria-live="polite"
      >
        <UiStatusPill
          tone="outline"
          size="lg"
        >
          {{ staffing(board) }}
        </UiStatusPill>
        <UiStatusPill
          :tone="board.complete ? 'azur' : 'ambre'"
          size="lg"
        >
          {{ board.complete ? 'Complet' : openPlaces(board.open_places) }}
        </UiStatusPill>
      </div>
      <p
        v-if="moveFailure"
        role="alert"
        class="text-sm font-semibold text-ambre-800"
      >
        {{ moveFailure }}
      </p>
      <ul
        v-if="stations.length > 0"
        class="grid gap-4 md:grid-cols-2"
        :aria-busy="loading || undefined"
      >
        <li
          v-for="(station, index) in stations"
          :key="station.id"
        >
          <StationsCard
            :station
            :event-id="event.id"
            :first="index === 0"
            :last="index === stations.length - 1"
            @changed="changed"
            @move="move(index, $event)"
          />
        </li>
      </ul>
      <p
        v-else
        class="rounded-tile border border-dashed border-argent-300 px-5 py-8 text-center text-argent-600"
      >
        Aucun poste pour cet événement. Ajoutez le premier ci-dessous.
      </p>
    </template>
    <UiCard
      title="Ajouter un poste"
      class="max-w-3xl"
    >
      <StationsForm
        action="Ajouter le poste"
        :save="add"
        @saved="changed"
      />
    </UiCard>
    <StationsReminder class="max-w-3xl" />
  </div>
</template>
