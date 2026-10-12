<script setup lang="ts">
import type { components } from '~/types/api'

type DocumentOut = components['schemas']['DocumentOut']

definePageMeta({ path: '/bureau/documents/attestation' })

useHead({ title: 'Attestation sur l’honneur' })

const BREADCRUMB = [{ label: 'Documents', to: DOCUMENTS_PATH }, { label: 'Attestation sur l’honneur' }]

// Opened from an event's deposit, the purchase was for it: `?evenement=12`.
const route = useRoute()
const event = computed(() => {
  const id = Number(route.query.evenement)
  return Number.isInteger(id) && id > 0 ? id : null
})

// The statement made, an invoice awaiting review, opens in the Documents page.
async function open(document: DocumentOut): Promise<void> {
  void refreshBoardOverview()
  await navigateTo(documentLocation(document.id))
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-6">
    <UiBreadcrumb :items="BREADCRUMB" />
    <div class="flex flex-col gap-1.5">
      <BoardPageTitle>Attestation sur l’honneur</BoardPageTitle>
      <p class="text-lead text-argent-600">
        Le ticket de caisse d’un achat pour le comité est perdu ? Décrivez l’achat : l’application en fait une attestation sur l’honneur à votre nom, en PDF, rangée parmi les factures.
      </p>
    </div>
    <UiCard>
      <DocumentsStatementForm
        :event
        @made="open"
      />
    </UiCard>
  </div>
</template>
