<script setup lang="ts">
import { FileText, X } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type DocumentOut = components['schemas']['DocumentOut']
type DocumentCategory = components['schemas']['DocumentCategory']

// The upload of a document: a file dropped or chosen, then how the member
// classifies it. Without the assistant (phase 9), the board classifies by hand:
// its category, a title (the file's name to start with), and its event.
const { event = null } = defineProps<{
  /** The event the document is uploaded for, when the form comes from one. */
  event?: number | null
}>()

const emit = defineEmits<{
  /** A file was chosen: the form shows. */
  chosen: []
  uploaded: [document: DocumentOut]
}>()

const SHOWN: ReadonlySet<string> = new Set(['file', 'category', 'title', 'event'])

const { uploadDocument } = useDocumentWrites()

const file = ref<File | null>(null)
// An empty value shows the select's invitation, and the browser asks for a choice.
const category = ref<DocumentCategory | ''>('')
const title = ref('')
const chosenEvent = ref<number | null>(event)
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const zone = useTemplateRef<{ choose: () => void }>('zone')
const form = useTemplateRef<HTMLFormElement>('form')

const eventOptions = useEventChoices(NO_EVENT_CHOICE)
// Without a receipt to upload, a sworn statement stands in for it (D14), for the same event.
const statement = eventLocation(STATEMENT_PATH, event)

/** Opens the file picker: the « Importer » button of the top bar. */
function choose(): void {
  zone.value?.choose()
}

function chose(chosenFile: File): void {
  file.value = chosenFile
  title.value = fileTitle(chosenFile.name)
  errors.value = null
  emit('chosen')
}

function reset(): void {
  file.value = null
  category.value = ''
  title.value = ''
  chosenEvent.value = event
  errors.value = null
}

async function submit(): Promise<void> {
  // The browser asks for a category before the form is sent.
  if (file.value === null || category.value === '') return
  pending.value = true
  const result = await uploadDocument(file.value, { category: category.value, title: title.value, event: chosenEvent.value })
  pending.value = false
  if (result.errors) {
    errors.value = placeErrors(result.errors, SHOWN, documentFieldLabel)
    await focusErrors(form)
    return
  }
  reset()
  emit('uploaded', result.data)
}

defineExpose({ choose })
</script>

<template>
  <div class="flex flex-col gap-3">
    <UiDropZone
      ref="zone"
      :accept="DOCUMENT_TYPES"
      @choose="chose"
    >
      Glissez un PDF ou une photo de ticket ici, ou
    </UiDropZone>
    <UiButton
      v-if="!file"
      variant="link"
      class="self-start"
      :to="statement"
    >
      Pas de ticket ? Faire une attestation sur l’honneur
    </UiButton>
    <UiCard v-if="file">
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
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-3">
            <FileText
              :size="18"
              class="shrink-0 text-argent-600"
            />
            <p class="min-w-0 flex-1 truncate text-ui">
              <span class="font-medium">{{ file.name }}</span>
              <span class="text-argent-600"> · {{ fileSize(file.size) }}</span>
            </p>
            <UiIconButton
              label="Retirer le fichier"
              size="sm"
              @click="reset"
            >
              <X :size="16" />
            </UiIconButton>
          </div>
          <UiAlertText v-if="errors?.fields.file">
            {{ errors.fields.file.join(' ') }}
          </UiAlertText>
        </div>
        <div class="flex flex-wrap items-start gap-4">
          <UiField
            v-slot="{ control }"
            label="Catégorie"
            class="w-full sm:w-56"
            :errors="errors?.fields.category"
          >
            <UiSelect
              v-bind="control"
              v-model="category"
              :options="DOCUMENT_CATEGORY_OPTIONS"
              placeholder="Choisir une catégorie"
              required
            />
          </UiField>
          <UiField
            v-slot="{ control }"
            label="Titre"
            class="min-w-60 flex-1"
            :errors="errors?.fields.title"
          >
            <UiInput
              v-bind="control"
              v-model="title"
              required
            />
          </UiField>
          <UiField
            v-slot="{ control }"
            label="Événement"
            class="w-full sm:w-80"
            :errors="errors?.fields.event"
          >
            <UiSelect
              v-bind="control"
              v-model="chosenEvent"
              :options="eventOptions"
            />
          </UiField>
        </div>
        <div class="flex gap-2">
          <UiButton
            type="submit"
            :loading="pending"
          >
            Déposer
          </UiButton>
          <UiButton
            variant="secondary"
            @click="reset"
          >
            Annuler
          </UiButton>
        </div>
      </form>
    </UiCard>
  </div>
</template>
