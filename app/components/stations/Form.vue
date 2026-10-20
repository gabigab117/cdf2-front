<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { StationFields } from '~/utils/stations'

type StationIn = components['schemas']['StationIn']

const { initial = stationFields(), action, cancellable = false, save } = defineProps<{
  initial?: StationFields
  /** The button that sends: « Ajouter le poste », « Enregistrer ». */
  action: string
  cancellable?: boolean
  /** Sends the station: the errors to show, or null once it is saved. */
  save: (payload: StationIn) => Promise<FormErrors | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [] }>()

const fields = ref<StationFields>({ ...initial })
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const form = useTemplateRef<HTMLFormElement>('form')

const SHOWN = new Set(['name', 'description', 'required_count'])

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(stationPayload(fields.value))
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, SHOWN, stationFieldLabel)
    await focusErrors(form)
    return
  }
  errors.value = null
  // A station added leaves the form ready for the next one.
  fields.value = { ...initial }
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
        label="Nom du poste"
        class="min-w-52 flex-1"
        :errors="errors?.fields.name"
      >
        <UiInput
          v-bind="control"
          v-model="fields.name"
          required
          placeholder="Frites, BBQ…"
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Personnes requises"
        class="w-full sm:w-40"
        :errors="errors?.fields.required_count"
      >
        <UiInput
          v-bind="control"
          v-model="fields.requiredCount"
          type="number"
          min="1"
          inputmode="numeric"
          required
        />
      </UiField>
    </div>
    <UiField
      v-slot="{ control }"
      label="Description"
      optional
      :errors="errors?.fields.description"
    >
      <UiTextarea
        v-bind="control"
        v-model="fields.description"
        rows="2"
        placeholder="Horaires, consignes…"
      />
    </UiField>
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
