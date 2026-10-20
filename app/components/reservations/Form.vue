<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { ReservationFields } from '~/utils/reservations'

type TicketTypeStatsOut = components['schemas']['TicketTypeStatsOut']
type ReservationIn = components['schemas']['ReservationIn']

const { ticketTypes, initial, action, cancellable = false, save } = defineProps<{
  /** The event's types of place: a quantity for each. */
  ticketTypes: readonly TicketTypeStatsOut[]
  initial: ReservationFields
  /** The button that sends: « Enregistrer la réservation », « Enregistrer ». */
  action: string
  cancellable?: boolean
  /** Sends the reservation: the errors to show, or null once it is saved. */
  save: (payload: ReservationIn) => Promise<FormErrors | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [] }>()

const fields = ref<ReservationFields>(structuredClone(toRaw(initial)))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const form = useTemplateRef<HTMLFormElement>('form')

const SHOWN = new Set(['name', 'note'])

async function submit(): Promise<void> {
  const payload = reservationPayload(fields.value, ticketTypes)
  // An error of a line names its type, by its place among the lines sent.
  const sent = payload.lines.map(line => ticketTypes.find(ticketType => ticketType.id === line.ticket_type) ?? { name: '' })
  pending.value = true
  const result = await save(payload)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, SHOWN, path => reservationFieldLabel(path, sent))
    await focusErrors(form)
    return
  }
  errors.value = null
  fields.value = structuredClone(toRaw(initial))
  emit('saved')
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-4"
    @submit.prevent="submit"
  >
    <UiAlert
      v-if="errors?.form.length"
      tabindex="-1"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiAlert>
    <div class="flex flex-wrap items-start gap-4">
      <UiField
        v-slot="{ control }"
        label="Nom"
        class="min-w-52 flex-1"
        :errors="errors?.fields.name"
      >
        <UiInput
          v-bind="control"
          v-model="fields.name"
          required
          placeholder="Nom de la personne"
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Remarque"
        optional
        class="min-w-52 flex-1"
        :errors="errors?.fields.note"
      >
        <UiInput
          v-bind="control"
          v-model="fields.note"
          placeholder="Remarque (table, placement…)"
        />
      </UiField>
    </div>
    <fieldset class="flex flex-col gap-2">
      <legend class="text-label font-semibold text-sable-600">
        Places
      </legend>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          v-for="ticketType in ticketTypes"
          :key="ticketType.id"
          class="flex flex-col gap-1.5"
        >
          <span class="text-note text-sable-600">{{ ticketType.name }}</span>
          <UiStepper
            :model-value="fields.quantities[ticketType.id] ?? 0"
            :label="ticketType.name"
            @update:model-value="fields.quantities[ticketType.id] = $event"
          />
        </div>
      </div>
    </fieldset>
    <div class="flex gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        {{ action }}
      </UiButton>
      <UiButton
        v-if="cancellable"
        variant="secondary"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
    </div>
  </form>
</template>
