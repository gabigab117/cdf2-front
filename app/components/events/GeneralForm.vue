<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type EventOut = components['schemas']['EventOut']

const { event } = defineProps<{
  /** The event to change; without one, the form creates an event. */
  event?: EventOut
}>()

const emit = defineEmits<{ saved: [event: EventOut] }>()

const fields = ref(generalInfoFields(event))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const { saveEvent } = useEventWrites()

// A board counts a handful of members, and a previous edition is among the
// latest past events: one page of each serves. The form needs neither to be
// used, its current choices being always among the options.
const { data: members } = useLazyAsyncData('board:members', (_nuxtApp, { signal }) =>
  loadData(useApi().GET('/api/board/members', { params: { query: { page_size: 100 } }, signal })),
)
const { data: pastEvents } = useLazyAsyncData('board:past-events', (_nuxtApp, { signal }) =>
  loadData(useApi().GET('/api/board/events', { params: { query: { period: 'past', page_size: 100 } }, signal })),
)

const leads = computed(() => leadOptions(members.value?.items ?? [], event?.lead ?? null))
const editions = computed(() =>
  previousEditionOptions(pastEvents.value?.items ?? [], event?.previous_edition ?? null, event?.id ?? null),
)

const submitLabel = computed(() => (event ? 'Enregistrer' : 'Créer l’événement'))
const cancelPath = computed(() => (event ? eventPath(event.id) : EVENTS_PATH))

const form = useTemplateRef<HTMLFormElement>('form')

async function save(): Promise<void> {
  const { category } = fields.value
  // The browser asks for a category before the form is sent.
  if (category === '') return
  pending.value = true
  const general = generalInfoPayload({ ...fields.value, category })
  const result = await saveEvent(
    event ? { ...receivedEventIn(event), ...general } : { ...general, ...NEW_EVENT_PUBLIC_INFO },
    event?.id,
  )
  pending.value = false
  if (result.errors) {
    errors.value = placeErrors(result.errors, GENERAL_INFO_PATHS, eventFieldLabel)
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
    return
  }
  errors.value = null
  emit('saved', result.event)
}
</script>

<template>
  <form
    ref="form"
    class="flex max-w-3xl flex-col gap-5"
    @submit.prevent="save"
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
    <UiCard title="Informations générales">
      <div class="grid gap-4 md:grid-cols-2">
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.title"
          :errors="errors?.fields.title"
          class="md:col-span-2"
        >
          <UiInput
            :id
            v-model="fields.title"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.category"
          :errors="errors?.fields.category"
        >
          <UiSelect
            :id
            v-model="fields.category"
            :options="CATEGORY_OPTIONS"
            placeholder="Choisir une catégorie"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.venue_name"
          :errors="errors?.fields.venue_name"
        >
          <UiInput
            :id
            v-model="fields.venue_name"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.starts_at"
          :errors="errors?.fields.starts_at"
        >
          <UiInput
            :id
            v-model="fields.starts_at"
            type="datetime-local"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.ends_at"
          optional
          :errors="errors?.fields.ends_at"
        >
          <UiInput
            :id
            v-model="fields.ends_at"
            type="datetime-local"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.start_label"
          optional
          help="Par exemple « Ouverture » : il précède l’heure du début."
          :errors="errors?.fields.start_label"
        >
          <UiInput
            :id
            v-model="fields.start_label"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.lead"
          optional
          :errors="errors?.fields.lead"
          class="md:col-start-1"
        >
          <UiSelect
            :id
            v-model="fields.lead"
            :options="leads"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.previous_edition"
          optional
          help="Le même événement, l’an dernier."
          :errors="errors?.fields.previous_edition"
        >
          <UiSelect
            :id
            v-model="fields.previous_edition"
            :options="editions"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="EVENT_FIELD_LABELS.slug"
          optional
          help="L’adresse de sa page sur le site. Laissée vide, elle est tirée du titre et de l’année : halloween-des-enfants-2026."
          :errors="errors?.fields.slug"
          class="md:col-span-2"
        >
          <UiInput
            :id
            v-model="fields.slug"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
      </div>
    </UiCard>
    <div class="flex flex-wrap gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        {{ submitLabel }}
      </UiButton>
      <UiButton
        variant="secondary"
        :to="cancelPath"
      >
        Annuler
      </UiButton>
    </div>
  </form>
</template>
