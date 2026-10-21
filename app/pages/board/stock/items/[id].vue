<script setup lang="ts">
import type { ItemFields } from '~/utils/stock'

definePageMeta({ path: '/bureau/stock/articles/:id(\\d+)' })

const route = useRoute()
const id = Number(route.params.id)

// The item is read from the stock, which holds every item: an id the stock
// does not have turns the page into the page not found.
const { data: stock, error, refresh } = useStock()
const entry = computed(() => stock.value?.items.find(found => found.item.id === id) ?? null)
const item = computed(() => entry.value?.item ?? null)
watch(stock, (read) => {
  if (read && !item.value) showError({ status: 404, statusText: 'Not Found' })
})

useHead({ title: () => item.value?.name ?? 'Article' })

// Its stock card, by page (D16): the page lives in the address.
const page = computed(() => queryPage(route.query.page))
const { data: history, pending: loadingHistory, error: historyError, refresh: refreshHistory } = useItemHistory(id, () => page.value)
const historyLines = computed(() => history.value?.items ?? [])
const pageCount = computed(() => Math.ceil((history.value?.count ?? 0) / OPERATIONS_PAGE_SIZE))

function pageLocation(target: number) {
  return { query: { page: pageParam(target) } }
}

const { updateItem, deleteItem } = useStockWrites()

const breadcrumb = computed(() => [{ label: 'Stock', to: STOCK_PATH }, { label: item.value?.name ?? '' }])

async function save(fields: ItemFields) {
  const result = await updateItem(id, itemPayload(fields))
  if (result.errors) return result.errors
  await navigateTo(STOCK_PATH)
  return null
}

function remove(): Promise<string | null> {
  return deleteItem(id)
}

async function deleted(): Promise<void> {
  await navigateTo(STOCK_PATH)
}
</script>

<template>
  <div class="flex max-w-200 flex-col gap-5.5">
    <template v-if="entry && item">
      <UiBreadcrumb
        :items="breadcrumb"
        back
      />
      <BoardPageTitle>{{ item.name }}</BoardPageTitle>
      <StockItemPrices :entry />
      <UiCard
        title="Fiche de stock"
        flush
        :aria-busy="loadingHistory || undefined"
      >
        <BoardLoadError
          v-if="historyError"
          :message="historyError.message"
          @retry="refreshHistory()"
        />
        <StockItemHistory
          v-else-if="historyLines.length > 0"
          :lines="historyLines"
          :unit="item.unit"
        >
          <UiPagination
            class="px-5.5 pt-2 pb-4"
            :page
            :page-count
            :to="pageLocation"
          />
        </StockItemHistory>
        <UiEmptyState v-else-if="!loadingHistory">
          Aucun mouvement pour l’instant.
        </UiEmptyState>
      </UiCard>
      <UiCard title="Article">
        <StockItemForm
          :item
          :save
          :remove
          @deleted="deleted"
        />
      </UiCard>
    </template>
    <BoardLoadError
      v-else-if="error"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
