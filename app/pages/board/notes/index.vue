<script setup lang="ts">
definePageMeta({ path: '/bureau/notes' })

useHead({ title: 'Notes générales' })

const BREADCRUMB = [{ label: 'Tableau de bord', to: BOARD_HOME_PATH }, { label: 'Notes générales' }]

// The notes without an event (A11): those of the shopping list sent to the
// board, those written here, by page.
const route = useRoute()
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isInteger(value) && value > 1 ? value : 1
})

const { data, status, error, refresh } = useGeneralNotes(() => page.value)

const notes = computed(() => data.value?.items ?? [])
const count = computed(() => data.value?.count ?? 0)
const loading = computed(() => status.value === 'pending')

// A note just published shows on the first page.
async function published(): Promise<void> {
  if (page.value > 1) await navigateTo(pageLocation(1))
  else await refresh()
}

function pageLocation(target: number) {
  return { query: { page: target > 1 ? String(target) : undefined } }
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-6">
    <UiBreadcrumb :items="BREADCRUMB" />
    <BoardPageTitle>Notes générales</BoardPageTitle>
    <NotesList
      :notes
      :count
      :page
      :loading
      :error
      :event="null"
      :page-location="pageLocation"
      empty="Aucune note générale."
      @changed="refresh()"
      @published="published"
      @retry="refresh()"
    />
  </div>
</template>
