<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'
import type { NoteDraft } from '~/utils/notes'

const {
  label,
  placeholder,
  action,
  initial = { text: '', tag: null },
  tagged = false,
  composer = false,
  cancellable = false,
  save,
} = defineProps<{
  /** What the text is, for screen readers: the placeholder says it to the eye. */
  label: string
  placeholder?: string
  /** The button that sends: « Publier », « Enregistrer », « Répondre ». */
  action: string
  initial?: NoteDraft
  /** A note takes a tag; a reply has none. */
  tagged?: boolean
  /** The input zone of the mockup: a card of its own, its text without a frame. */
  composer?: boolean
  cancellable?: boolean
  /** Sends the draft: the errors to show, or null once it is saved. */
  save: (draft: NoteDraft) => Promise<FormErrors | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [] }>()

const draft = ref<NoteDraft>({ ...initial })
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const form = useTemplateRef<HTMLFormElement>('form')

const SHOWN = new Set(['text', 'tag'])

const classes = {
  form: {
    composer: 'flex flex-col rounded-tile border border-argent-200 bg-white shadow-composer',
    inline: 'flex flex-col gap-3',
  },
  toolbar: {
    composer: 'flex flex-wrap items-center gap-2 px-3.5 pt-2 pb-2.5',
    inline: 'flex flex-wrap items-center gap-2',
  },
  callout: {
    composer: 'mx-3.5 mt-3.5',
    inline: '',
  },
}

const look = computed(() => (composer ? 'composer' : 'inline'))

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(draft.value)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, SHOWN, noteFieldLabel)
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
    return
  }
  errors.value = null
  // A note published or a reply sent leaves the form empty for the next one.
  draft.value = { ...initial }
  emit('saved')
}
</script>

<template>
  <form
    ref="form"
    :class="classes.form[look]"
    @submit.prevent="submit"
  >
    <UiCallout
      v-if="errors?.form.length"
      tone="ambre"
      role="alert"
      tabindex="-1"
      :icon="CircleAlert"
      :class="classes.callout[look]"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiCallout>
    <UiField
      v-slot="{ id, describedby, invalid }"
      :label
      hidden-label
      :errors="errors?.fields.text"
    >
      <UiTextarea
        :id
        v-model="draft.text"
        :rows="composer ? 3 : 2"
        :placeholder
        required
        :bare="composer"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div :class="classes.toolbar[look]">
      <div
        v-if="tagged"
        class="w-44"
      >
        <UiSelect
          v-model="draft.tag"
          :options="NOTE_TAG_OPTIONS"
          size="sm"
          aria-label="Étiquette"
          :invalid="Boolean(errors?.fields.tag)"
        />
      </div>
      <p
        v-if="errors?.fields.tag"
        class="text-sm text-ambre-800"
      >
        {{ errors.fields.tag.join(' ') }}
      </p>
      <div class="ml-auto flex gap-2">
        <UiButton
          v-if="cancellable"
          variant="secondary"
          size="sm"
          @click="emit('cancel')"
        >
          Annuler
        </UiButton>
        <UiButton
          type="submit"
          size="sm"
          :loading="pending"
        >
          {{ action }}
        </UiButton>
      </div>
    </div>
  </form>
</template>
