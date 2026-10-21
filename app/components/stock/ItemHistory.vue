<script setup lang="ts">
import type { components } from '~/types/api'

type ItemHistoryLineOut = components['schemas']['ItemHistoryLineOut']

// « Fiche de stock » (D16): the movements of an item, the latest first, each
// valued by the API at the cost of its time, with the stock, its value and its
// average cost after it, each leading to its operation. Below 820 px, a line
// keeps its operation and its movement, its figures under them.
const { lines, unit } = defineProps<{
  lines: readonly ItemHistoryLineOut[]
  /** The item's unit, written after its quantities. */
  unit: string
}>()

const { signedQuantity, quantity } = useQuantityFormat()
const { signed, unitAmount } = useMoneyFormat()
const { writtenDay } = useDateFormat()
const now = useNow()

// The columns of the header and of each line.
const classes = {
  grid: 'grid-cols-item-history-narrow md:grid-cols-item-history',
}

const rows = computed(() =>
  lines.map((line) => {
    const day = writtenDay(line.operation.created_at, now.value)
    const value = signed(line.value)
    const stock = quantity(line.quantity_after, unit)
    return {
      id: line.operation.id,
      to: operationPath(line.operation.id),
      day,
      title: operationTitle(line.operation),
      event: line.operation.event?.title ?? null,
      movement: signedQuantity(line.delta, unit),
      unitCost: unitAmount(line.unit_cost),
      value,
      stock,
      average: unitAmount(line.average_cost_after),
      // Under its operation below 820 px, where these columns are hidden.
      details: `${day} · ${value} · ${stock} en stock`,
      unpriced: line.unpriced,
    }
  }),
)
</script>

<template>
  <div class="flex flex-col">
    <div
      aria-hidden="true"
      class="grid items-center gap-3 border-b border-argent-100 bg-argent-25 px-5.5 py-2.5 text-caption font-semibold tracking-table text-argent-600 uppercase"
      :class="classes.grid"
    >
      <span class="max-md:hidden">Date</span>
      <span>Opération</span>
      <span class="text-right">Mouvement</span>
      <span class="text-right max-md:hidden">Prix unitaire</span>
      <span class="text-right max-md:hidden">Valeur</span>
      <span class="text-right max-md:hidden">Stock</span>
      <span class="text-right max-md:hidden">Prix moyen</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="row in rows"
        :key="row.id"
      >
        <UiSelectableRow
          :selected="false"
          :to="row.to"
        >
          <span
            class="grid items-center gap-3 px-5.5 py-3 text-sm"
            :class="classes.grid"
          >
            <span class="text-argent-600 max-md:hidden">{{ row.day }}</span>
            <span class="flex min-w-0 flex-col leading-snug">
              <span class="flex items-center gap-2">
                <span class="truncate font-medium text-sable-950">{{ row.title }}</span>
                <UiStatusPill
                  v-if="row.unpriced"
                  tone="ambre"
                  size="sm"
                >
                  Sans prix
                </UiStatusPill>
              </span>
              <span
                v-if="row.event"
                class="truncate text-caption text-argent-600"
              >{{ row.event }}</span>
              <span class="text-caption text-argent-600 md:hidden">{{ row.details }}</span>
            </span>
            <span class="text-right font-mono font-semibold">{{ row.movement }}</span>
            <span class="text-right font-mono max-md:hidden">{{ row.unitCost }}</span>
            <span class="text-right font-mono max-md:hidden">{{ row.value }}</span>
            <span class="text-right font-mono max-md:hidden">{{ row.stock }}</span>
            <span class="text-right font-mono max-md:hidden">{{ row.average }}</span>
          </span>
        </UiSelectableRow>
      </li>
    </ul>
    <slot />
  </div>
</template>
