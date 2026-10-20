<script setup lang="ts">
import { FileText, Paperclip, X } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'
import type { NoteDraft } from '~/utils/notes'

const {
  label,
  placeholder,
  action,
  initial = { text: '', tag: null },
  tagged = false,
  composer = false,
  attachable = false,
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
  /** « Joindre un fichier »: a new note takes a file, uploaded as a document. */
  attachable?: boolean
  cancellable?: boolean
  /** Sends the draft: the errors to show, or null once it is saved. */
  save: (draft: NoteDraft) => Promise<FormErrors | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [] }>()

const draft = ref<NoteDraft>({ ...initial })
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const form = useTemplateRef<HTMLFormElement>('form')
const picker = useTemplateRef<HTMLInputElement>('picker')

function attach(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // The same file chosen again is a new choice.
  input.value = ''
  if (file) draft.value = { ...draft.value, file }
}

function detach(): void {
  draft.value = { ...draft.value, file: null }
}

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
    await focusErrors(form)
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
    <UiAlert
      v-if="errors?.form.length"
      tabindex="-1"
      :class="classes.callout[look]"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiAlert>
    <UiField
      v-slot="{ control }"
      :label
      hidden-label
      :errors="errors?.fields.text"
    >
      <UiTextarea
        v-bind="control"
        v-model="draft.text"
        :rows="composer ? 3 : 2"
        :placeholder
        required
        :bare="composer"
      />
    </UiField>
    <div
      v-if="draft.file"
      class="mx-3.5 flex w-fit max-w-full items-center gap-2 rounded-control border border-argent-200 bg-argent-50 py-1 pr-1 pl-3 text-note"
    >
      <FileText
        :size="16"
        class="shrink-0 text-argent-600"
      />
      <span class="truncate">{{ draft.file.name }}</span>
      <UiIconButton
        label="Retirer la pièce jointe"
        size="sm"
        surface="plain"
        @click="detach"
      >
        <X :size="14" />
      </UiIconButton>
    </div>
    <div :class="classes.toolbar[look]">
      <template v-if="attachable">
        <UiIconButton
          label="Joindre un fichier"
          size="sm"
          surface="plain"
          @click="picker?.click()"
        >
          <Paperclip :size="18" />
        </UiIconButton>
        <input
          ref="picker"
          type="file"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          :accept="DOCUMENT_TYPES"
          @change="attach"
        >
      </template>
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
