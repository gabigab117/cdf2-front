<script setup lang="ts">
import { CircleAlert, X } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type ReservationStatsOut = components['schemas']['ReservationStatsOut']
type TicketTypeStatsOut = components['schemas']['TicketTypeStatsOut']

// The types of place of an event, and its capacity: what its reservations take.
const { eventId, stats } = defineProps<{ eventId: number, stats: ReservationStatsOut }>()

const emit = defineEmits<{ changed: [] }>()

const { addTicketType, deleteTicketType, setCapacity } = useReservationWrites(eventId)

const capacity = ref(stats.capacity === null ? '' : String(stats.capacity))
const capacityErrors = ref<FormErrors | null>(null)
const savingCapacity = ref(false)
const capacitySaved = ref(false)

const name = ref('')
const typeErrors = ref<FormErrors | null>(null)
const adding = ref(false)

// The type whose deletion is being asked, in the page.
const removing = ref<TicketTypeStatsOut | null>(null)
const removal = ref<{ pending: boolean, failure: string | null }>({ pending: false, failure: null })

watch(() => stats.capacity, (value) => {
  capacity.value = value === null ? '' : String(value)
})

const capacityMessages = computed(() => capacityErrors.value ? [...capacityErrors.value.form, ...Object.values(capacityErrors.value.fields).flat()] : [])
const typeMessages = computed(() => typeErrors.value ? [...typeErrors.value.form, ...Object.values(typeErrors.value.fields).flat()] : [])

async function saveCapacity(): Promise<void> {
  savingCapacity.value = true
  capacitySaved.value = false
  capacityErrors.value = await setCapacity(capacity.value === '' ? null : Number(capacity.value))
  savingCapacity.value = false
  if (capacityErrors.value) return
  capacitySaved.value = true
  emit('changed')
}

async function addType(): Promise<void> {
  adding.value = true
  typeErrors.value = await addTicketType(name.value)
  adding.value = false
  if (typeErrors.value) return
  name.value = ''
  emit('changed')
}

function ask(ticketType: TicketTypeStatsOut): void {
  removal.value = { pending: false, failure: null }
  removing.value = ticketType
}

async function remove(): Promise<void> {
  if (!removing.value) return
  removal.value = { pending: true, failure: null }
  const failure = await deleteTicketType(removing.value.id)
  removal.value = { pending: false, failure }
  if (failure) return
  removing.value = null
  emit('changed')
}
</script>

<template>
  <UiCard title="Types de place et capacité">
    <form
      class="flex flex-col gap-2"
      @submit.prevent="saveCapacity"
      @input="capacitySaved = false"
    >
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Capacité"
        optional
        help="Laisser vide si le nombre de places n’est pas limité."
        :errors="capacityMessages"
      >
        <div class="flex flex-wrap gap-2">
          <UiInput
            :id
            v-model="capacity"
            type="number"
            min="1"
            inputmode="numeric"
            class="w-40"
            :aria-describedby="describedby"
            :invalid
          />
          <UiButton
            type="submit"
            variant="secondary"
            :loading="savingCapacity"
          >
            Enregistrer
          </UiButton>
        </div>
      </UiField>
      <p
        v-if="capacitySaved"
        role="status"
        class="text-sm font-medium text-azur-700"
      >
        Capacité enregistrée.
      </p>
    </form>
    <ul
      v-if="stats.ticket_types.length > 0"
      class="flex flex-wrap gap-2"
    >
      <li
        v-for="ticketType in stats.ticket_types"
        :key="ticketType.id"
        class="inline-flex h-9 items-center gap-2 rounded-full border border-argent-200 bg-white pr-1 pl-3.5 text-note"
      >
        <span class="font-medium text-sable-950">{{ ticketType.name }}</span>
        <span class="font-mono text-argent-600">{{ ticketType.seats }}</span>
        <button
          type="button"
          class="inline-flex size-7 items-center justify-center rounded-full text-argent-600 transition-colors hover:bg-argent-100 hover:text-sable-950"
          :aria-label="`Supprimer le type de place ${ticketType.name}`"
          @click="ask(ticketType)"
        >
          <X :size="14" />
        </button>
      </li>
    </ul>
    <p
      v-else
      class="text-sm text-argent-600"
    >
      Aucun type de place. Créez-en un pour ouvrir les réservations.
    </p>
    <UiConfirmation
      v-if="removing"
      :question="`Supprimer le type de place « ${removing.name} » ?`"
      :pending="removal.pending"
      :failure="removal.failure"
      @confirm="remove"
      @cancel="removing = null"
    />
    <form
      class="flex flex-wrap items-center gap-2"
      @submit.prevent="addType"
    >
      <UiInput
        v-model="name"
        aria-label="Nom du type de place"
        placeholder="Menu adulte, Menu enfant…"
        required
        class="min-w-48 flex-1 sm:max-w-80"
        :invalid="typeMessages.length > 0"
      />
      <UiButton
        type="submit"
        variant="secondary"
        :loading="adding"
      >
        Ajouter un type
      </UiButton>
      <UiCallout
        v-if="typeMessages.length"
        tone="ambre"
        role="alert"
        :icon="CircleAlert"
        class="w-full"
      >
        <p
          v-for="message in typeMessages"
          :key="message"
        >
          {{ message }}
        </p>
      </UiCallout>
    </form>
  </UiCard>
</template>
