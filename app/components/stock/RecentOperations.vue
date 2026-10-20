<script setup lang="ts">
import { ArrowDown, ArrowUp, ClipboardCheck } from '@lucide/vue'
import type { components } from '~/types/api'

type StockOperationOut = components['schemas']['StockOperationOut']

// « Mouvements récents »: the latest operations, a click on − or + among them,
// each with who made it and what it moved.
const { operations } = defineProps<{ operations: readonly StockOperationOut[] }>()

// How many movements an operation names before « et 3 autres ».
const NAMED = 3

const { signedQuantity } = useQuantityFormat()
const { writtenDay } = useDateFormat()
const now = useNow()
const titleId = useId()

const classes = {
  in: 'bg-azur-100 text-azur-600',
  out: 'bg-argent-100 text-sable-800',
}

// The way the stock went: up for what came in, down for what went out, a
// clipboard for a stocktake, which counts both ways.
function look({ reason, movements }: StockOperationOut) {
  if (reason === 'stocktake') return { icon: ClipboardCheck, iconClass: classes.out }
  const balance = movements.reduce((sum, movement) => sum + Number(movement.delta), 0)
  return balance < 0 ? { icon: ArrowDown, iconClass: classes.out } : { icon: ArrowUp, iconClass: classes.in }
}

// « −216 Canettes de soda 33 cl, −96 … et 2 autres · 14 sept. »; a stocktake is
// dated as such, and says when it found no difference.
function line({ reason, movements, created_at }: StockOperationOut): string {
  const day = writtenDay(created_at, now.value)
  const date = reason === 'stocktake' ? `inventaire du ${day}` : day
  if (movements.length === 0) return `Aucun écart · ${date}`
  const named = movements.slice(0, NAMED).map(({ item, delta }) => `${signedQuantity(delta, item.unit)} ${item.name}`)
  const others = movements.length - NAMED
  const rest = others > 0 ? ` et ${countText(others, 'autre', 'autres')}` : ''
  return `${named.join(', ')}${rest} · ${date}`
}

const rows = computed(() =>
  operations.map(operation => ({
    id: operation.id,
    ...look(operation),
    title: `${operation.label || STOCK_REASONS[operation.reason]} · ${memberSignature(operation.author)}`,
    line: line(operation),
  })),
)
</script>

<template>
  <UiCard
    flush
    :aria-labelledby="titleId"
  >
    <h2
      :id="titleId"
      class="border-b border-argent-100 px-5 py-4.5 text-base font-semibold"
    >
      Mouvements récents
    </h2>
    <ul
      v-if="rows.length > 0"
      class="flex flex-col py-1.5"
    >
      <li
        v-for="row in rows"
        :key="row.id"
        class="flex gap-3 px-5 py-3"
      >
        <span
          class="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-segment"
          :class="row.iconClass"
        >
          <component
            :is="row.icon"
            :size="15"
          />
        </span>
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="text-sm font-medium">{{ row.title }}</span>
          <span class="text-note text-argent-600">{{ row.line }}</span>
        </span>
      </li>
    </ul>
    <UiEmptyState v-else>
      Aucun mouvement pour l’instant.
    </UiEmptyState>
  </UiCard>
</template>
