<script setup lang="ts">
definePageMeta({ path: '/bureau/stock/operations' })

useHead({ title: 'Opérations du stock' })

const breadcrumb = [{ label: 'Stock', to: STOCK_PATH }, { label: 'Opérations' }]

const route = useRoute()
const query = computed(() => parseOperationsQuery(route.query))

const { data: page, pending: loading, error, refresh } = useStockOperations(() => query.value)

const operations = computed(() => page.value?.items ?? [])
const pageCount = computed(() => Math.ceil((page.value?.count ?? 0) / OPERATIONS_PAGE_SIZE))
const emptyText = computed(() =>
  query.value.unpriced ? 'Aucun achat n’attend son prix.' : 'Aucune opération pour l’instant.',
)

// Every operation, or the purchases and deliveries waiting for a cost (D16).
const chips = [
  { label: 'Toutes', unpriced: false },
  { label: 'Sans prix', unpriced: true },
]

function location(unpriced: boolean) {
  return { query: operationsQuery({ unpriced, page: 1 }) }
}

function pageLocation(target: number) {
  return { query: operationsQuery({ ...query.value, page: target }) }
}
</script>

<template>
  <div class="flex max-w-200 flex-col gap-5.5">
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <BoardPageTitle>Opérations du stock</BoardPageTitle>
    <nav
      aria-label="Filtrer les opérations"
      class="flex flex-wrap gap-2"
    >
      <UiFilterChip
        v-for="chip in chips"
        :key="chip.label"
        :pressed="query.unpriced === chip.unpriced"
        :to="location(chip.unpriced)"
      >
        {{ chip.label }}
      </UiFilterChip>
    </nav>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <UiCard
      v-else
      flush
      :aria-busy="loading || undefined"
    >
      <ul
        v-if="operations.length > 0"
        class="flex flex-col divide-y divide-argent-100"
      >
        <StockOperationRow
          v-for="operation in operations"
          :key="operation.id"
          :operation
        />
      </ul>
      <UiEmptyState v-else-if="!loading">
        {{ emptyText }}
      </UiEmptyState>
      <UiPagination
        class="px-5.5 pt-2 pb-4"
        :page="query.page"
        :page-count
        :to="pageLocation"
      />
    </UiCard>
  </div>
</template>
