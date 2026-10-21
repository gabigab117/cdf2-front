<script setup lang="ts">
import type { components } from '~/types/api'

type StockOperationDetailOut = components['schemas']['StockOperationDetailOut']

definePageMeta({ path: '/bureau/stock/operations/:id(\\d+)' })

const id = Number(useRoute().params.id)

const { data: operation, error, refresh } = useStockOperation(id)
// The operation comes once the page shows: one that does not exist turns it
// into the page not found.
watch(error, (failure) => {
  if (failure?.status === 404) showError({ status: 404, statusText: 'Not Found' })
})

const { writtenDay } = useDateFormat()
const now = useNow()

const title = computed(() => (operation.value ? operationTitle(operation.value) : 'Opération du stock'))
useHead({ title: () => title.value })

const breadcrumb = computed(() => [
  { label: 'Stock', to: STOCK_PATH },
  { label: 'Opérations', to: OPERATIONS_PATH },
  { label: title.value },
])

// « Achat · 12 sept. · Julie R. · Brocante »
const subtitle = computed(() => {
  if (!operation.value) return ''
  const { reason, created_at, author, event } = operation.value
  return [STOCK_REASONS[reason], writtenDay(created_at, now.value), memberSignature(author), event?.title].filter(Boolean).join(' · ')
})

// The costs of a purchase or a delivery are completed, then corrected (D16).
const editing = ref(false)
const costsLabel = computed(() => (operation.value?.unpriced ? 'Compléter les prix' : 'Corriger les prix'))

function saved(written: StockOperationDetailOut): void {
  operation.value = written
  editing.value = false
}
</script>

<template>
  <div class="flex max-w-200 flex-col gap-5.5">
    <template v-if="operation">
      <UiBreadcrumb
        :items="breadcrumb"
        back
      />
      <div class="flex flex-col gap-1.5">
        <BoardPageTitle>{{ title }}</BoardPageTitle>
        <p class="text-lead text-argent-600">
          {{ subtitle }}
        </p>
      </div>
      <StockCostsForm
        v-if="editing"
        :operation
        @saved="saved"
        @cancel="editing = false"
      />
      <UiCard
        v-else
        title="Lignes"
        flush
      >
        <template
          v-if="operation.priceable"
          #actions
        >
          <UiButton
            variant="secondary"
            size="sm"
            @click="editing = true"
          >
            {{ costsLabel }}
          </UiButton>
        </template>
        <StockOperationLines :operation />
      </UiCard>
    </template>
    <BoardLoadError
      v-else-if="error && error.status !== 404"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
