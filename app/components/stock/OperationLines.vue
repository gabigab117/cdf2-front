<script setup lang="ts">
import type { components } from '~/types/api'

type StockOperationDetailOut = components['schemas']['StockOperationDetailOut']

// The lines of an operation, valued by the API at the cost of their time (D16):
// what each moved, what it cost, its unit cost and its value. Below 820 px, each
// line keeps its item and its value, its figures under its name.
const { operation } = defineProps<{ operation: StockOperationDetailOut }>()

const { signedQuantity } = useQuantityFormat()
const { amount, signed, unitAmount } = useMoneyFormat()

// The columns of the header and of each line; a cost paid in mono, as the
// figures go, a cost to complete in amber.
const classes = {
  grid: 'grid-cols-operation-lines-narrow md:grid-cols-operation-lines',
  cost: 'font-mono',
  unpriced: 'text-note font-semibold text-ambre-800',
}

const rows = computed(() =>
  operation.lines.map((line) => {
    const quantity = signedQuantity(line.delta, line.item.unit)
    const cost = line.unpriced ? 'À compléter' : amount(line.cost)
    const unitCost = unitAmount(line.unit_cost)
    return {
      id: line.item.id,
      name: line.item.name,
      quantity,
      cost,
      costClass: line.unpriced ? classes.unpriced : classes.cost,
      unitCost,
      value: signed(line.value),
      // Under its name below 820 px, where these columns are hidden.
      details: [quantity, cost, unitCost].join(' · '),
    }
  }),
)
const costText = computed(() => `Total payé : ${amount(operation.cost)}`)
</script>

<template>
  <div class="flex flex-col">
    <div
      aria-hidden="true"
      class="grid items-center gap-3 border-b border-argent-100 bg-argent-25 px-5.5 py-2.5 text-caption font-semibold tracking-table text-argent-600 uppercase"
      :class="classes.grid"
    >
      <span>Article</span>
      <span class="text-right max-md:hidden">Quantité</span>
      <span class="text-right max-md:hidden">Payé</span>
      <span class="text-right max-md:hidden">Prix unitaire</span>
      <span class="text-right">Valeur</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="row in rows"
        :key="row.id"
        class="grid items-center gap-3 px-5.5 py-3 text-ui"
        :class="classes.grid"
      >
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="font-medium text-sable-950">{{ row.name }}</span>
          <span class="text-caption text-argent-600 md:hidden">{{ row.details }}</span>
        </span>
        <span class="text-right font-mono max-md:hidden">{{ row.quantity }}</span>
        <span
          class="text-right max-md:hidden"
          :class="row.costClass"
        >{{ row.cost }}</span>
        <span class="text-right font-mono max-md:hidden">{{ row.unitCost }}</span>
        <span class="text-right font-mono font-semibold">{{ row.value }}</span>
      </li>
    </ul>
    <p
      v-if="operation.priceable"
      class="border-t border-argent-100 px-5.5 py-3 text-ui font-medium"
    >
      {{ costText }}
    </p>
  </div>
</template>
