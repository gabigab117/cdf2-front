<script setup lang="ts">
import type { components } from '~/types/api'

type StockedItemOut = components['schemas']['StockedItemOut']

// Where an item's value stands (D16), as the API values it: its weighted
// average cost, the value of what is in stock, the unit cost of its latest
// purchase paid.
const { entry } = defineProps<{ entry: StockedItemOut }>()

const { amount, unitAmount } = useMoneyFormat()

const rows = computed(() => [
  { label: 'Prix moyen pondéré', value: unitAmount(entry.average_cost) },
  { label: 'Valeur en stock', value: amount(entry.value) },
  { label: 'Dernier prix d’achat', value: unitAmount(entry.last_unit_cost) },
])
</script>

<template>
  <UiCard title="Prix">
    <dl class="flex flex-col">
      <UiDetailRow
        v-for="row in rows"
        :key="row.label"
        :label="row.label"
        class="last:border-b-0"
      >
        <dd class="font-mono font-medium">
          {{ row.value }}
        </dd>
      </UiDetailRow>
    </dl>
    <p
      v-if="entry.value === null"
      class="text-note text-argent-600"
    >
      Sans prix de départ ni achat payé, son stock n’est pas valorisé.
    </p>
  </UiCard>
</template>
