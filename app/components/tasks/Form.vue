<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { Option } from '~/utils/event-form'
import type { TaskFields } from '~/utils/tasks'

type TaskOut = components['schemas']['TaskOut']

const {
  initial,
  assignee = null,
  events,
  action,
  cancellable = false,
  save,
} = defineProps<{
  initial: TaskFields
  /** Whom the task is assigned to so far: they stay among the choices. */
  assignee?: TaskOut['assignee']
  /** The events to choose from, when the form does not come from one. */
  events?: readonly Option<number>[]
  /** The button that sends: « Ajouter », « Enregistrer », « Créer la tâche ». */
  action: string
  cancellable?: boolean
  /** Sends the task: the errors to show, or null once it is saved. */
  save: (fields: TaskFields) => Promise<FormErrors | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [] }>()

const fields = ref<TaskFields>({ ...initial })
// The event chosen, when the form does not come from one: an empty value shows
// the select's invitation, and the browser asks for a choice.
const event = ref<number | ''>(initial.event ?? '')
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const { data: members } = useBoardMembers()
const assignees = computed(() => memberOptions(members.value?.items ?? [], assignee, 'Personne'))

const form = useTemplateRef<HTMLFormElement>('form')

const shown = computed(() => new Set(['title', 'assignee', 'due_date', ...(events ? ['event'] : [])]))

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

async function submit(): Promise<void> {
  // The browser asks for an event before the form is sent.
  if (events && event.value === '') return
  pending.value = true
  const result = await save(events ? { ...fields.value, event: event.value || null } : fields.value)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, shown.value, taskFieldLabel)
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
    return
  }
  errors.value = null
  // A task added leaves the form empty for the next one.
  fields.value = { ...initial }
  event.value = initial.event ?? ''
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
    <UiField
      v-if="events"
      v-slot="{ id, describedby, invalid }"
      label="Événement"
      :errors="fieldErrors('event')"
    >
      <UiSelect
        :id
        v-model="event"
        :options="events"
        placeholder="Choisir un événement"
        required
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div class="flex flex-wrap items-start gap-4">
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Titre"
        class="min-w-60 flex-1"
        :errors="fieldErrors('title')"
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
        label="Assignée à"
        optional
        class="w-full sm:w-52"
        :errors="fieldErrors('assignee')"
      >
        <UiSelect
          :id
          v-model="fields.assignee"
          :options="assignees"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Échéance"
        optional
        class="w-full sm:w-44"
        :errors="fieldErrors('due_date')"
      >
        <UiInput
          :id
          v-model="fields.dueDate"
          type="date"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
    </div>
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
