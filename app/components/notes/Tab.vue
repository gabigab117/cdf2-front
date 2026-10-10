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

const notes = computed(() => data.value?.items ?? [])
const pageCount = computed(() => Math.ceil((data.value?.count ?? 0) / NOTES_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')
const leadId = computed(() => event.lead?.id ?? null)

function publish({ text, tag }: NoteDraft): Promise<FormErrors | null> {
  return publishNote({ event: event.id, text, tag, pinned: false })
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
