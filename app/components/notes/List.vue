<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { NoteDraft } from '~/utils/notes'

type NoteOut = components['schemas']['NoteOut']

// Notes as a tab or a page shows them: the input zone, then the notes, the
// pinned ones first, by page. Whoever shows them fetches them: an event's tab,
// or the page of the general notes.
const { notes, count, page, loading = false, error = null, event, leadId = null, pageLocation, empty } = defineProps<{
  notes: readonly NoteOut[]
  /** How many notes there are in all, every page together. */
  count: number
  page: number
  loading?: boolean
  error?: Error | null
  /** The event a new note is on, or none for a general note. */
  event: number | null
  /** The event's lead, whose avatar stands out. */
  leadId?: number | null
  pageLocation: (page: number) => RouteLocationRaw
  /** What the list says when it holds no note. */
  empty: string
}>()

const emit = defineEmits<{ changed: [], published: [], retry: [] }>()

const { publishNote } = useNoteWrites()
const { uploadDocument } = useDocumentWrites()

const pageCount = computed(() => Math.ceil(count / NOTES_PAGE_SIZE))

// The file attached to a note is uploaded first, as a document of the board, a
// misc one of the note's event, to review; the note then names it. Kept until
// the note is published: a new try sends it again rather than the same file,
// which the upload would refuse.
let uploaded: { file: File, id: number } | null = null

async function publish({ text, tag, file }: NoteDraft): Promise<FormErrors | null> {
  if (file && uploaded?.file !== file) {
    const upload = await uploadDocument(file, { category: 'misc', title: fileTitle(file.name), event })
    if (upload.errors) return attachmentErrors(upload.errors)
    uploaded = { file, id: upload.data.id }
  }
  const document = file ? (uploaded?.id ?? null) : null
  const errors = await publishNote({ event, text, tag, pinned: false, document })
  if (errors === null) uploaded = null
  return errors
}

// The input zone shows no field of a document: every error of the upload is
// its attachment's.
function attachmentErrors(errors: FormErrors): FormErrors {
  return { form: errors.form, fields: { file: Object.values(errors.fields).flat() } }
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <NotesForm
      composer
      tagged
      attachable
      label="Nouvelle note pour le bureau"
      placeholder="Écrire une note pour le bureau…"
      action="Publier"
      :save="publish"
      @saved="emit('published')"
    />
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="emit('retry')"
    />
    <template v-else>
      <ul
        v-if="notes.length > 0"
        class="flex flex-col gap-4"
        :aria-busy="loading || undefined"
      >
        <li
          v-for="note in notes"
          :key="note.id"
        >
          <NotesCard
            :note
            :lead-id
            @changed="emit('changed')"
          />
        </li>
      </ul>
      <p
        v-else-if="!loading"
        class="py-6 text-center text-argent-600"
      >
        {{ empty }}
      </p>
      <UiPagination
        :page
        :page-count
        :to="pageLocation"
      />
    </template>
  </div>
</template>
