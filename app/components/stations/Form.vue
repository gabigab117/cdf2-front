<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'
import type { StationFields } from '~/utils/stations'

const { initial = stationFields(), action, cancellable = false, save } = defineProps<{
  initial?: StationFields
  /** The button that sends: « Ajouter le poste », « Enregistrer ». */
  action: string
  cancellable?: boolean
  /** Sends the station: the errors to show, or null once it is saved. */
  save: (fields: StationFields) => Promise<FormErrors | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [] }>()

const fields = ref<StationFields>({ ...initial })
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const form = useTemplateRef<HTMLFormElement>('form')

const SHOWN = new Set(['name', 'description', 'required_count'])

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(fields.value)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, SHOWN, stationFieldLabel)
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
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
    <UiCallout
      v-if="errors?.form.length"
      tone="ambre"
      role="alert"
      tabindex="-1"
      :icon="CircleAlert"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiCallout>
    <div class="flex flex-wrap items-start gap-4">
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Nom du poste"
        class="min-w-52 flex-1"
        :errors="fieldErrors('name')"
      >
        <UiInput
          :id
          v-model="fields.name"
          required
          placeholder="Frites, BBQ…"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Personnes requises"
        class="w-full sm:w-40"
        :errors="fieldErrors('required_count')"
      >
        <UiInput
          :id
          v-model="fields.requiredCount"
          type="number"
          min="1"
          inputmode="numeric"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
    </div>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Description"
      optional
      :errors="fieldErrors('description')"
    >
      <UiTextarea
        :id
        v-model="fields.description"
        rows="2"
        placeholder="Horaires, consignes…"
        :aria-describedby="describedby"
        :invalid
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
