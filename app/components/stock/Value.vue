<script setup lang="ts">
import type { components } from '~/types/api'

type StockValuationOut = components['schemas']['StockValuationOut']

// « Valeur du stock » (D16): its items at their weighted average cost, as the
// API values them, in all and by category, and what it cannot value yet.
const { valuation } = defineProps<{ valuation: StockValuationOut }>()

const { amount } = useMoneyFormat()

const categories = computed(() =>
  valuation.categories.map(({ category, value }) => ({
    category,
    label: STOCK_CATEGORIES[category].label,
    value: amount(value),
  })),
)
// The items no cost values, and the purchases waiting for theirs.
const notes = computed(() => [
  ...(valuation.unvalued_items > 0
    ? [`${countText(valuation.unvalued_items, 'article', 'articles')} sans prix de départ ni achat payé, hors de cette valeur.`]
    : []),
  ...(valuation.unpriced_purchases > 0
    ? [`${countText(valuation.unpriced_purchases, 'achat', 'achats')} sans prix, au prix moyen d’ici là.`]
    : []),
])
</script>

<template>
  <UiCard title="Valeur du stock">
    <p class="font-mono text-headline font-semibold">
      {{ amount(valuation.value) }}
    </p>
    <dl class="flex flex-col">
      <UiDetailRow
        v-for="row in categories"
        :key="row.category"
        :label="row.label"
        :value="row.value"
      />
    </dl>
    <p
      v-for="note in notes"
      :key="note"
      class="text-note text-argent-600"
    >
      {{ note }}
    </p>
    <BoardTextLink
      v-if="valuation.unpriced_purchases > 0"
      :to="UNPRICED_LOCATION"
      label="Compléter les prix"
      class="self-start text-note"
    />
    <BoardTextLink
      :to="MANAGEMENT_PATH"
      label="Voir le contrôle de gestion"
      class="self-start text-note"
    />
  </UiCard>
</template>
