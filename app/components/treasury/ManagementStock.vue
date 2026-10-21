<script setup lang="ts">
import type { components } from '~/types/api'

type ManagementOut = components['schemas']['ManagementOut']

// The stock of a fiscal year (D16): what it was worth on 1 January, what each
// category is worth at the end of the year, and the whole then.
const { management, closingLabel } = defineProps<{
  management: ManagementOut
  /** « Valeur au 31 décembre », or « Valeur aujourd’hui » for the current year. */
  closingLabel: string
}>()

const { amount } = useMoneyFormat()

const rows = computed(() => [
  { key: 'opening', label: 'Valeur au 1er janvier', value: amount(management.totals.opening_value) },
  ...management.stock.categories.map(({ category, value }) => ({
    key: category,
    label: STOCK_CATEGORIES[category].label,
    value: amount(value),
  })),
  { key: 'closing', label: closingLabel, value: amount(management.totals.closing_value) },
])
</script>

<template>
  <UiCard title="Stock">
    <UiDetailList :rows />
    <p class="text-note text-argent-600">
      Chaque article au prix moyen pondéré de ses achats.
    </p>
  </UiCard>
</template>
