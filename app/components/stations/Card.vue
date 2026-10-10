<script setup lang="ts">
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { StationFields } from '~/utils/stations'

type StationOut = components['schemas']['StationOut']

const { station, eventId, first, last } = defineProps<{
  station: StationOut
  eventId: number
  /** The station comes first, or last: it cannot move further. */
  first: boolean
  last: boolean
}>()

const emit = defineEmits<{ changed: [], move: [step: -1 | 1] }>()

const { rewriteStation, deleteStation, assign, unassign } = useStationWrites(eventId)

const editing = ref(false)
const person = ref({ name: '', role: '' })
const personErrors = ref<FormErrors | null>(null)
const assigning = ref(false)
const removalFailure = ref<string | null>(null)

const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const question = computed(() => `Supprimer le poste « ${station.name} » et toutes ses affectations ?`)

// The person's form is a single line: its errors read after the name of their field.
const PERSON_FIELDS: Readonly<Record<string, string>> = { name: 'Nom', role: 'Rôle' }
const personMessages = computed(() =>
  personErrors.value ? placeErrors(personErrors.value, new Set(), path => PERSON_FIELDS[path] ?? path).form : [],
)

function rewrite(fields: StationFields): Promise<FormErrors | null> {
  return rewriteStation(station.id, stationPayload(fields))
}

function rewritten(): void {
  editing.value = false
  emit('changed')
}

async function remove(): Promise<void> {
  if (await confirm(() => deleteStation(station.id))) emit('changed')
}

async function addPerson(): Promise<void> {
  assigning.value = true
  personErrors.value = await assign(station.id, person.value)
  assigning.value = false
  if (personErrors.value) return
  person.value = { name: '', role: '' }
  emit('changed')
}

async function removePerson(id: number): Promise<void> {
  removalFailure.value = await unassign(id)
  if (!removalFailure.value) emit('changed')
}
</script>

<template>
  <article
    class="flex flex-col gap-4 rounded-tile border border-t-4 border-argent-200 bg-white px-5 py-4.5"
    :class="station.complete ? 'border-t-azur-600' : 'border-t-ambre-500'"
  >
    <StationsForm
      v-if="editing"
      :initial="stationFields(station)"
      action="Enregistrer"
      cancellable
      :save="rewrite"
      @saved="rewritten"
      @cancel="editing = false"
    />
    <template v-else>
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <h3 class="text-lead font-semibold text-sable-950">
            {{ station.name }}
          </h3>
          <p
            v-if="station.description"
            class="text-sm whitespace-pre-line text-sable-600"
          >
            {{ station.description }}
          </p>
        </div>
        <UiStatusPill
          :tone="station.complete ? 'azur' : 'ambre'"
          class="font-mono"
        >
          {{ station.assigned_count }}/{{ station.required_count }}
        </UiStatusPill>
      </div>
      <ul
        v-if="station.assignments.length > 0"
        class="flex flex-col gap-2"
      >
        <li
          v-for="assignment in station.assignments"
          :key="assignment.id"
          class="flex items-center justify-between gap-3"
        >
          <span class="flex min-w-0 flex-wrap items-center gap-2 text-ui text-sable-950">
            {{ assignment.name }}
            <UiStatusPill
              v-if="assignment.role"
              size="sm"
            >
              {{ assignment.role }}
            </UiStatusPill>
          </span>
          <UiIconButton
            :label="`Retirer ${assignment.name} du poste`"
            size="sm"
            @click="removePerson(assignment.id)"
          >
            <X :size="16" />
          </UiIconButton>
        </li>
      </ul>
      <p
        v-else
        class="text-sm text-argent-600"
      >
        Personne pour l’instant.
      </p>
      <p
        v-if="removalFailure"
        role="alert"
        class="text-sm font-semibold text-ambre-800"
      >
        {{ removalFailure }}
      </p>
      <form
        class="flex flex-wrap items-center gap-2"
        @submit.prevent="addPerson"
      >
        <UiInput
          v-model="person.name"
          aria-label="Nom"
          placeholder="Nom"
          required
          class="min-w-32 flex-1"
          :invalid="Boolean(personErrors?.fields.name)"
        />
        <UiInput
          v-model="person.role"
          aria-label="Rôle"
          placeholder="Rôle (facultatif)"
          class="min-w-32 flex-1"
        />
        <UiButton
          type="submit"
          size="sm"
          :loading="assigning"
          :aria-label="`Ajouter une personne au poste ${station.name}`"
        >
          <Plus :size="16" />
        </UiButton>
        <p
          v-if="personMessages.length"
          role="alert"
          class="w-full text-sm font-semibold text-ambre-800"
        >
          {{ personMessages.join(' ') }}
        </p>
      </form>
      <div class="flex flex-wrap gap-1.5 border-t border-argent-100 pt-3">
        <UiIconButton
          label="Monter le poste"
          size="sm"
          :disabled="first"
          @click="emit('move', -1)"
        >
          <ChevronUp :size="16" />
        </UiIconButton>
        <UiIconButton
          label="Descendre le poste"
          size="sm"
          :disabled="last"
          @click="emit('move', 1)"
        >
          <ChevronDown :size="16" />
        </UiIconButton>
        <UiIconButton
          label="Modifier le poste"
          size="sm"
          class="ml-auto"
          @click="editing = true"
        >
          <Pencil :size="16" />
        </UiIconButton>
        <UiIconButton
          ref="trigger"
          label="Supprimer le poste"
          size="sm"
          @click="ask"
        >
          <Trash2 :size="16" />
        </UiIconButton>
      </div>
      <UiConfirmation
        v-if="confirming"
        :question
        :pending
        :failure
        @confirm="remove"
        @cancel="dismiss"
      />
    </template>
  </article>
</template>
