<script setup lang="ts">
import type { components } from '~/types/api'

type EventOut = components['schemas']['EventOut']

// The « Notes du bureau » tab of an event: its notes, by page.
const { event, page } = defineProps<{
  event: EventOut
  /** The page of the notes the address asks for. */
  page: number
}>()

const { data, status, error, refresh } = useEventNotes(event.id, () => page)

const notes = computed(() => data.value?.items ?? [])
const count = computed(() => data.value?.count ?? 0)
const loading = computed(() => status.value === 'pending')

// A write changes the notes, and the count of their tab.
async function changed(): Promise<void> {
  await Promise.all([refresh(), refreshEventDashboard(event.id)])
}

// A note just published shows on the first page.
async function published(): Promise<void> {
  if (page > 1) {
    await navigateTo(pageLocation(1))
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
  <NotesList
    :notes
    :count
    :page
    :loading
    :error
    :event="event.id"
    :lead-id="event.lead?.id ?? null"
    :page-location="pageLocation"
    empty="Aucune note pour cet événement."
    @changed="changed"
    @published="published"
    @retry="refresh()"
  />
</template>
