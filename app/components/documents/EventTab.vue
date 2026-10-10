<script setup lang="ts">
import { Upload } from '@lucide/vue'
import type { components } from '~/types/api'

type EventOut = components['schemas']['EventOut']

// The « Documents » tab of an event: its documents, by page, each leading to
// its panel in the Documents page, and the deposit of a new one for it.
const { event, page } = defineProps<{
  event: EventOut
  /** The page of the documents the address asks for. */
  page: number
}>()

const { data, status, error, refresh } = useEventDocuments(event.id, () => page)

const documents = computed(() => data.value?.items ?? [])
const pageCount = computed(() => Math.ceil((data.value?.count ?? 0) / DOCUMENTS_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')
const deposit = computed(() => ({ path: NEW_DOCUMENT_PATH, query: { evenement: String(event.id) } }))

function pageLocation(target: number) {
  return { query: eventPageQuery({ tab: 'documents', page: target }) }
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-5">
    <UiButton
      class="self-start"
      :to="deposit"
    >
      <Upload :size="18" />
      Déposer un document
    </UiButton>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <template v-else>
      <UiCard
        flush
        :aria-busy="loading || undefined"
      >
        <DocumentsTable
          v-if="documents.length > 0"
          :documents
          :location="documentLocation"
          :event-column="false"
        />
        <UiEmptyState
          v-else-if="!loading"
        >
          Aucun document pour cet événement.
        </UiEmptyState>
      </UiCard>
      <UiPagination
        :page
        :page-count
        :to="pageLocation"
      />
    </template>
  </div>
</template>
