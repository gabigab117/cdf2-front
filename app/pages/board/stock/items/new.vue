<script setup lang="ts">
import type { ItemFields } from '~/utils/stock'

definePageMeta({ path: '/bureau/stock/articles/nouveau' })

useHead({ title: 'Nouvel article' })

const { addItem } = useStockWrites()

const breadcrumb = [{ label: 'Stock', to: STOCK_PATH }, { label: 'Nouvel article' }]

// The item recorded, the stock shows it among the others, with nothing in it
// yet: a stocktake or a purchase brings its quantity.
async function save(fields: ItemFields) {
  const result = await addItem(itemPayload(fields))
  if (result.errors) return result.errors
  await navigateTo(STOCK_PATH)
  return null
}
</script>

<template>
  <div class="flex max-w-160 flex-col gap-5.5">
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <BoardPageTitle>Nouvel article</BoardPageTitle>
    <UiCard>
      <StockItemForm :save />
    </UiCard>
  </div>
</template>
