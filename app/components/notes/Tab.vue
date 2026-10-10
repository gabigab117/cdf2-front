<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { NoteDraft } from '~/utils/notes'

type EventOut = components['schemas']['EventOut']

// The « Notes du bureau » tab of an event: the input zone, then the notes,
// the pinned ones first, by page.
const { event, page } = defineProps<{
  event: EventOut
  /** The page of the notes the address asks for. */
  page: number
}>()

const { data, status, error, refresh } = useEventNotes(event.id, () => page)
const { publishNote } = useNoteWrites()
const { uploadDocument } = useDocumentWrites()

const notes = computed(() => data.value?.items ?? [])
const pageCount = computed(() => Math.ceil((data.value?.count ?? 0) / NOTES_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')
const leadId = computed(() => event.lead?.id ?? null)

// The file joined to a note is deposited first, as a document of the board, a
// misc one of the event, to review; the note then names it. Kept until the
// note is published: a new try sends it again rather than the same file, which
// the deposit would refuse.
let deposited: { file: File, id: number } | null = null

async function publish({ text, tag, file }: NoteDraft): Promise<FormErrors | null> {
  if (file && deposited?.file !== file) {
    const upload = await uploadDocument(file, { category: 'misc', title: fileTitle(file.name), event: event.id })
    if (upload.errors) return attachmentErrors(upload.errors)
    deposited = { file, id: upload.data.id }
    void refreshBoardOverview()
  }
  const document = file ? (deposited?.id ?? null) : null
  const errors = await publishNote({ event: event.id, text, tag, pinned: false, document })
  if (errors === null) deposited = null
  return errors
}

// The input zone shows no field of a document: every error of the deposit is
// its attachment's.
function attachmentErrors(errors: FormErrors): FormErrors {
  return { form: errors.form, fields: { file: Object.values(errors.fields).flat() } }
}

// A write changes the notes, and the count of their tab.
async function changed(): Promise<void> {
  await Promise.all([refresh(), refreshEventDashboard(event.id)])
}

// A note just published shows on the first page.
async function published(): Promise<void> {
  if (page > 1) {
    await navigateTo({ query: eventPageQuery({ tab: 'notes', page: 1 }) })
    await refreshEventDashboard(event.id)
    return
  }
  await changed()
}

function pageLocation(target: number) {
  return { query: eventPageQuery({ tab: 'notes', page: target }) }
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
      @saved="published"
    />
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
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
            @changed="changed"
          />
        </li>
      </ul>
      <p
        v-else-if="!loading"
        class="py-6 text-center text-argent-600"
      >
        Aucune note pour cet événement.
      </p>
      <UiPagination
        :page
        :page-count
        :to="pageLocation"
      />
    </template>
  </div>
</template>
