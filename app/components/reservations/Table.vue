<script setup lang="ts">
import { Download, Pencil, Trash2 } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type EventOut = components['schemas']['EventOut']
type ReservationOut = components['schemas']['ReservationOut']
type ReservationIn = components['schemas']['ReservationIn']
type ReservationStatsOut = components['schemas']['ReservationStatsOut']

// The reservations of an event, a column per type of place and a row of
// totals, which come from the figures of the API, never added up here.
const { event, stats, page } = defineProps<{
  event: EventOut
  stats: ReservationStatsOut
  /** The page of the reservations the address asks for. */
  page: number
}>()

const emit = defineEmits<{ changed: [] }>()

const { data, status, error, refresh } = useEventReservations(event.id, () => page)
const { rewriteReservation, deleteReservation, exportReservations } = useReservationWrites(event.id)
const { recordedAt } = useDateFormat()

const reservations = computed(() => data.value?.items ?? [])
const pageCount = computed(() => Math.ceil((data.value?.count ?? 0) / RESERVATIONS_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')
const columns = computed(() => stats.ticket_types.length + 5)

const editing = ref<number | null>(null)
const removing = ref<ReservationOut | null>(null)
const removal = ref<{ pending: boolean, failure: string | null }>({ pending: false, failure: null })
const exporting = ref(false)
const exportFailure = ref<string | null>(null)

function rewrite(reservation: ReservationOut) {
  return (payload: ReservationIn): Promise<FormErrors | null> => rewriteReservation(reservation.id, payload)
}

async function rewritten(): Promise<void> {
  editing.value = null
  await refresh()
  emit('changed')
}

function ask(reservation: ReservationOut): void {
  removal.value = { pending: false, failure: null }
  removing.value = reservation
}

async function remove(): Promise<void> {
  if (!removing.value) return
  removal.value = { pending: true, failure: null }
  const failure = await deleteReservation(removing.value.id)
  removal.value = { pending: false, failure }
  if (failure) return
  removing.value = null
  await refresh()
  emit('changed')
}

async function download(): Promise<void> {
  exporting.value = true
  exportFailure.value = await exportReservations(`reservations-${event.slug}.xlsx`)
  exporting.value = false
}

function pageLocation(target: number) {
  return { query: eventPageQuery({ tab: 'reservations', page: target }) }
}

defineExpose({ refresh })
</script>

<template>
  <div class="flex flex-col gap-4">
    <UiCard
      flush
      title="Réservations"
      :aria-busy="loading || undefined"
    >
      <template #actions>
        <UiButton
          variant="secondary"
          size="sm"
          :loading="exporting"
          @click="download"
        >
          <Download :size="16" />
          Exporter (Excel)
        </UiButton>
      </template>
      <p
        v-if="exportFailure"
        role="alert"
        class="px-5.5 pt-4 text-sm font-semibold text-ambre-800"
      >
        {{ exportFailure }}
      </p>
      <BoardLoadError
        v-if="error"
        :message="error.message"
        class="m-5.5"
        @retry="refresh()"
      />
      <div
        v-else-if="reservations.length > 0"
        class="overflow-x-auto"
      >
        <table class="w-full text-left text-ui">
          <thead>
            <tr class="border-b border-argent-100 bg-argent-25 text-caption font-semibold tracking-table text-argent-600 uppercase">
              <th
                scope="col"
                class="px-5.5 py-2.5 font-semibold"
              >
                Nom
              </th>
              <th
                scope="col"
                class="hidden px-3 py-2.5 font-semibold md:table-cell"
              >
                Remarque
              </th>
              <th
                scope="col"
                class="hidden px-3 py-2.5 font-semibold md:table-cell"
              >
                Saisie le
              </th>
              <th
                v-for="ticketType in stats.ticket_types"
                :key="ticketType.id"
                scope="col"
                class="px-3 py-2.5 text-right font-semibold"
              >
                {{ ticketType.name }}
              </th>
              <th
                scope="col"
                class="px-3 py-2.5 text-right font-semibold"
              >
                Total
              </th>
              <th
                scope="col"
                class="px-5.5 py-2.5"
              >
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-argent-100">
            <template
              v-for="reservation in reservations"
              :key="reservation.id"
            >
              <tr>
                <th
                  scope="row"
                  class="px-5.5 py-3 font-semibold text-sable-950"
                >
                  {{ reservation.name }}
                </th>
                <td class="hidden px-3 py-3 text-sable-600 md:table-cell">
                  {{ reservation.note }}
                </td>
                <td class="hidden px-3 py-3 whitespace-nowrap text-sable-600 md:table-cell">
                  {{ recordedAt(reservation.created_at) }}
                </td>
                <td
                  v-for="ticketType in stats.ticket_types"
                  :key="ticketType.id"
                  class="px-3 py-3 text-right font-mono"
                  :class="quantityOf(reservation, ticketType.id) === 0 ? 'text-argent-400' : 'text-sable-950'"
                >
                  {{ quantityOf(reservation, ticketType.id) }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-semibold">
                  {{ reservation.seats }}
                </td>
                <td class="px-5.5 py-3">
                  <div class="flex justify-end gap-1.5">
                    <UiIconButton
                      :label="`Modifier la réservation de ${reservation.name}`"
                      size="sm"
                      @click="editing = reservation.id"
                    >
                      <Pencil :size="16" />
                    </UiIconButton>
                    <UiIconButton
                      :label="`Supprimer la réservation de ${reservation.name}`"
                      size="sm"
                      @click="ask(reservation)"
                    >
                      <Trash2 :size="16" />
                    </UiIconButton>
                  </div>
                </td>
              </tr>
              <tr v-if="editing === reservation.id">
                <td
                  :colspan="columns"
                  class="bg-argent-25 px-5.5 py-4"
                >
                  <ReservationsForm
                    :ticket-types="stats.ticket_types"
                    :initial="reservationFields(stats.ticket_types, reservation)"
                    action="Enregistrer"
                    cancellable
                    :save="rewrite(reservation)"
                    @saved="rewritten"
                    @cancel="editing = null"
                  />
                </td>
              </tr>
              <tr v-if="removing?.id === reservation.id">
                <td
                  :colspan="columns"
                  class="px-5.5 py-4"
                >
                  <UiConfirmation
                    :question="`Supprimer la réservation de « ${reservation.name} » ?`"
                    :pending="removal.pending"
                    :failure="removal.failure"
                    @confirm="remove"
                    @cancel="removing = null"
                  />
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr class="border-t border-argent-200 font-semibold">
              <th
                scope="row"
                class="px-5.5 py-3"
              >
                Total
              </th>
              <td class="hidden md:table-cell" />
              <td class="hidden md:table-cell" />
              <td
                v-for="ticketType in stats.ticket_types"
                :key="ticketType.id"
                class="px-3 py-3 text-right font-mono"
              >
                {{ ticketType.seats }}
              </td>
              <td class="px-3 py-3 text-right font-mono">
                {{ stats.seats }}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p
        v-else-if="!loading"
        class="px-5.5 py-8 text-center text-argent-600"
      >
        Aucune réservation enregistrée pour le moment.
      </p>
    </UiCard>
    <UiPagination
      :page
      :page-count
      :to="pageLocation"
    />
  </div>
</template>
