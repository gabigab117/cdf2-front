<script setup lang="ts">
import type { components } from '~/types/api'

type StockLossesOut = components['schemas']['StockLossesOut']

// « Pertes d’inventaire » (D16): what the stocktakes of no event found
// missing over the year, item by item, at the average cost, the largest
// first. They count in the consumption of the general running.
const { losses } = defineProps<{ losses: StockLossesOut }>()

const { amount } = useMoneyFormat()
const { quantity } = useQuantityFormat()

const rows = computed(() =>
  losses.items.map(loss => ({
    id: loss.item.id,
    name: loss.item.name,
    quantity: quantity(loss.quantity, loss.item.unit),
    value: amount(loss.value),
  })),
)
const total = computed(() => amount(losses.total))
</script>

<template>
  <UiCard title="Pertes d’inventaire">
    <template v-if="rows.length > 0">
      <ul class="divide-y divide-argent-100">
        <li
          v-for="row in rows"
          :key="row.id"
          class="flex items-baseline justify-between gap-3 py-2.5 text-ui"
        >
          <span class="min-w-0 truncate text-sable-950">{{ row.name }}</span>
          <span class="flex shrink-0 gap-3 font-mono">
            <span class="text-argent-600">{{ row.quantity }}</span>
            <span class="font-medium">{{ row.value }}</span>
          </span>
        </li>
      </ul>
      <p class="flex justify-between gap-3 border-t border-argent-100 pt-3 text-ui font-semibold">
        <span>Total</span>
        <span class="font-mono">{{ total }}</span>
      </p>
    </template>
    <p
      v-else
      class="text-sm text-argent-600"
    >
      Aucune perte d’inventaire sur l’exercice.
    </p>
    <p class="text-note text-argent-600">
      Les écarts des inventaires faits hors événement. Ils comptent dans les marchandises consommées hors événement.
    </p>
  </UiCard>
</template>
