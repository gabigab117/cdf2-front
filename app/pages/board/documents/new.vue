<script setup lang="ts">
import type { components } from '~/types/api'

type DocumentOut = components['schemas']['DocumentOut']

definePageMeta({ path: '/bureau/documents/nouveau' })

useHead({ title: 'Nouveau document' })

const BREADCRUMB = [{ label: 'Documents', to: DOCUMENTS_PATH }, { label: 'Nouveau document' }]

// Deposited from an event, the document belongs to it: `?evenement=12`.
const route = useRoute()
const event = computed(() => {
  const id = Number(route.query.evenement)
  return Number.isInteger(id) && id > 0 ? id : null
})

// The document deposited, which now awaits the board, opens in the Documents
// page, to complete and validate it.
async function open(document: DocumentOut): Promise<void> {
  void refreshBoardOverview()
  await navigateTo(documentLocation(document.id))
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-6">
    <UiBreadcrumb :items="BREADCRUMB" />
    <BoardPageTitle>Nouveau document</BoardPageTitle>
    <DocumentsUploadForm
      :event
      @uploaded="open"
    />
  </div>
</template>
