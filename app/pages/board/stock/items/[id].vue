<script setup lang="ts">
import type { ItemFields } from '~/utils/stock'

definePageMeta({ path: '/bureau/stock/articles/:id(\\d+)' })

const id = Number(useRoute().params.id)

// The item is read from the stock, which holds every item: an id the stock
// does not have turns the page into the page not found.
const { data: stock, error, refresh } = useStock()
const item = computed(() => stock.value?.items.find(entry => entry.item.id === id)?.item ?? null)
watch(stock, (read) => {
  if (read && !item.value) showError({ status: 404, statusText: 'Not Found' })
})

useHead({ title: () => item.value?.name ?? 'Article' })

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
  <div class="flex max-w-160 flex-col gap-5.5">
    <template v-if="item">
      <UiBreadcrumb
        :items="breadcrumb"
        back
      />
      <BoardPageTitle>{{ item.name }}</BoardPageTitle>
      <UiCard>
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
