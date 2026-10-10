<script setup lang="ts">
import { Upload, X } from '@lucide/vue'
import type { components } from '~/types/api'
import type { DocumentsQuery } from '~/utils/documents'

type DocumentCategory = components['schemas']['DocumentCategory']
type DocumentOut = components['schemas']['DocumentOut']

definePageMeta({ path: '/bureau/documents', fullWidth: true, topBarAction: true })

useHead({ title: 'Documents' })

// How long the search waits for the typing to pause before it applies.
const SEARCH_DELAY_MS = 300

const route = useRoute()
const query = computed(() => parseDocumentsQuery(route.query))

const { data: page, status, error, refresh } = useDocuments(() => query.value)
const { data: counts, refresh: refreshCounts } = useDocumentCounts(() => query.value)

const documents = computed(() => page.value?.items ?? [])
const pageCount = computed(() => Math.ceil((page.value?.count ?? 0) / DOCUMENTS_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')
const emptyText = computed(() =>
  query.value.search !== '' || query.value.category !== null || query.value.toReview
    ? 'Aucun document ne correspond à cette recherche.'
    : 'Aucun document pour l’instant.',
)

// The document just deposited opens on its form, to complete it.
const editing = ref<number | null>(null)
const upload = useTemplateRef<{ choose: () => void }>('upload')

function location(changes: Partial<DocumentsQuery>) {
  return { query: documentsQuery({ ...query.value, ...changes }) }
}

function documentLink(id: number) {
  return location({ document: id })
}

function pageLocation(target: number) {
  return location({ page: target })
}

const chips = computed(() => [
  { label: 'Tous', category: null, count: counts.value?.total },
  ...(Object.keys(DOCUMENT_CATEGORIES) as DocumentCategory[]).map(category => ({
    label: DOCUMENT_CATEGORIES[category].chip,
    category,
    count: counts.value?.[category],
  })),
])

// The search applies once the typing pauses, and the address keeps it.
const search = ref(query.value.search)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (text) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (text !== query.value.search) navigateTo(location({ search: text, page: 1 }), { replace: true })
  }, SEARCH_DELAY_MS)
})
// Back or forward in the history brings its search into the field.
watch(() => query.value.search, (text) => {
  search.value = text
})
onBeforeUnmount(() => clearTimeout(searchTimer))

// A file chosen while a document is open on a phone: the list, where its form
// shows, comes back.
async function chosen(): Promise<void> {
  if (query.value.document !== null) await navigateTo(location({ document: null }))
}

async function uploaded(document: DocumentOut): Promise<void> {
  editing.value = document.id
  await navigateTo(location({ document: document.id }))
  changed()
}

// A write changes the list, its counts, and what awaits the board.
function changed(): void {
  void refresh()
  void refreshCounts()
  void refreshBoardOverview()
}

async function close(): Promise<void> {
  editing.value = null
  await navigateTo(location({ document: null }))
}

async function deleted(): Promise<void> {
  await close()
  changed()
}
</script>

<template>
  <div class="flex min-w-0 flex-1">
    <Teleport
      defer
      to="#board-top-bar-action"
    >
      <BoardTopBarButton
        :icon="Upload"
        label="Importer"
        @click="upload?.choose()"
      />
    </Teleport>
    <div
      class="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-8 md:pt-8 md:pb-12"
      :class="{ 'max-md:hidden': query.document !== null }"
    >
      <div class="flex flex-col gap-1.5">
        <BoardPageTitle>Documents</BoardPageTitle>
        <p class="text-lead text-argent-600">
          Déposez un fichier, classez-le, puis vérifiez ses informations avant de le valider.
        </p>
      </div>
      <UiSearchInput
        v-model="search"
        label="Rechercher dans les documents"
        placeholder="Fournisseur, montant, mot dans un compte rendu…"
      />
      <nav
        aria-label="Catégories"
        class="flex flex-wrap gap-2"
      >
        <UiFilterChip
          v-for="chip in chips"
          :key="chip.label"
          :pressed="query.category === chip.category"
          :count="chip.count"
          :to="location({ category: chip.category, page: 1, document: null })"
        >
          {{ chip.label }}
        </UiFilterChip>
        <UiFilterChip
          v-if="query.toReview"
          pressed
          :to="location({ toReview: false, page: 1 })"
        >
          À vérifier
          <X
            :size="14"
            aria-label="Retirer le filtre"
          />
        </UiFilterChip>
      </nav>
      <DocumentsUploadForm
        ref="upload"
        @chosen="chosen"
        @uploaded="uploaded"
      />
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
            :selected="query.document"
            :location="documentLink"
          />
          <p
            v-else-if="!loading"
            class="px-5.5 py-8 text-center text-argent-600"
          >
            {{ emptyText }}
          </p>
        </UiCard>
        <UiPagination
          :page="query.page"
          :page-count
          :to="pageLocation"
        />
      </template>
    </div>
    <DocumentsPanel
      v-if="query.document !== null"
      :id="query.document"
      :key="query.document"
      :start-editing="editing === query.document"
      class="md:sticky md:top-17 md:h-below-top-bar md:overflow-y-auto"
      @changed="changed"
      @deleted="deleted"
      @close="close"
    />
  </div>
</template>
