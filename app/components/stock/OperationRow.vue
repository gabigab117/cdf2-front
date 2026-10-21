<script setup lang="ts">
import { ArrowDown, ArrowUp, ClipboardCheck } from '@lucide/vue'
import type { components } from '~/types/api'

type StockOperationOut = components['schemas']['StockOperationOut']

// An operation of the stock as a list names it, leading to its page: who made
// it, what it moved, and whether it waits for a cost (D16).
const { operation } = defineProps<{ operation: StockOperationOut }>()

// How many movements an operation names before « et 3 autres ».
const NAMED = 3

const { signedQuantity } = useQuantityFormat()
const { writtenDay } = useDateFormat()
const now = useNow()

const classes = {
  in: 'bg-azur-100 text-azur-600',
  out: 'bg-argent-100 text-sable-800',
}

// The way the stock went: up for what came in, down for what went out, a
// clipboard for a stocktake, which counts both ways.
const look = computed(() => {
  if (operation.reason === 'stocktake') return { icon: ClipboardCheck, iconClass: classes.out }
  const balance = operation.movements.reduce((sum, movement) => sum + Number(movement.delta), 0)
  return balance < 0 ? { icon: ArrowDown, iconClass: classes.out } : { icon: ArrowUp, iconClass: classes.in }
})

const title = computed(() => `${operationTitle(operation)} · ${memberSignature(operation.author)}`)

// « −216 Canettes de soda 33 cl, −96 … et 2 autres · 14 sept. »; a stocktake is
// dated as such, and says when it found no difference.
const line = computed(() => {
  const { reason, movements, created_at } = operation
  const day = writtenDay(created_at, now.value)
  const date = reason === 'stocktake' ? `inventaire du ${day}` : day
  if (movements.length === 0) return `Aucun écart · ${date}`
  const named = movements.slice(0, NAMED).map(({ item, delta }) => `${signedQuantity(delta, item.unit)} ${item.name}`)
  const others = movements.length - NAMED
  const rest = others > 0 ? ` et ${countText(others, 'autre', 'autres')}` : ''
  return `${named.join(', ')}${rest} · ${date}`
})
</script>

<template>
  <li>
    <UiSelectableRow
      :selected="false"
      :to="operationPath(operation.id)"
    >
      <span class="flex gap-3 px-5 py-3">
        <span
          class="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-segment"
          :class="look.iconClass"
        >
          <component
            :is="look.icon"
            :size="15"
          />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="text-sm font-medium">{{ title }}</span>
          <span class="text-note text-argent-600">{{ line }}</span>
        </span>
        <UiStatusPill
          v-if="operation.unpriced"
          tone="ambre"
          size="sm"
          class="self-center"
        >
          Sans prix
        </UiStatusPill>
      </span>
    </UiSelectableRow>
  </li>
</template>
