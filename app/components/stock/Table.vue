<script setup lang="ts">
import type { components } from '~/types/api'

type StockDirection = components['schemas']['StockDirection']
type StockedItemOut = components['schemas']['StockedItemOut']

// The rows of the stock: each item leads to its page, and its − and + record a
// movement of its step.
const { items, sending = false } = defineProps<{
  items: readonly StockedItemOut[]
  /** A click is under way: the steppers wait for it. */
  sending?: boolean
}>()

const emit = defineEmits<{ adjust: [id: number, direction: StockDirection] }>()

const { quantity } = useQuantityFormat()
const { calendarMonth } = useDateFormat()

const rows = computed(() =>
  items.map(({ item, quantity: inStock, low, level }) => {
    const bestBefore = item.best_before ? calendarMonth(item.best_before) : '—'
    const threshold = quantity(item.threshold, item.unit)
    return {
      id: item.id,
      name: item.name,
      to: itemPath(item.id),
      low,
      // Amber below the threshold, as the mockup draws it.
      rowClass: low ? 'bg-ambre-25' : '',
      level,
      levelLabel: `Niveau : ${item.name}`,
      levelTone: low ? 'ambre' as const : 'azur' as const,
      quantity: Number(inStock),
      quantityText: quantity(inStock, item.unit),
      step: Number(item.step),
      // The buttons name the step they move: « Retirer : 24 Canettes de soda 33 cl ».
      stepLabel: `${quantity(item.step, item.unit)} ${item.name}`,
      threshold,
      bestBefore,
      // Below 820 px, the threshold and the best-before month go under the name.
      details: `Seuil ${threshold} · DLUO ${bestBefore}`,
    }
  }),
)

// The stepper gives the quantity it would show: only its way counts, the API
// moving the step, or what is left.
function adjust(id: number, shown: number, value: number): void {
  emit('adjust', id, value > shown ? 'in' : 'out')
}

const grid = 'grid-cols-stock-narrow md:grid-cols-stock'
</script>

<template>
  <div>
    <div
      class="grid items-center gap-3.5 border-b border-argent-100 bg-argent-25 px-5 py-2.5 text-caption font-semibold tracking-table text-argent-600 uppercase"
      :class="grid"
      aria-hidden="true"
    >
      <span>Article</span>
      <span class="text-center">Quantité</span>
      <span class="text-right max-md:hidden">Seuil</span>
      <span class="max-md:hidden">Niveau</span>
      <span class="max-md:hidden">DLUO</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="row in rows"
        :key="row.id"
        class="grid items-center gap-3.5 px-5 py-3"
        :class="[grid, row.rowClass]"
      >
        <span class="flex min-w-0 flex-col items-start gap-1">
          <NuxtLink
            :to="row.to"
            class="max-w-full truncate text-ui font-semibold text-sable-950 hover:text-azur-700"
          >{{ row.name }}</NuxtLink>
          <UiStatusPill
            v-if="row.low"
            tone="ambre"
            size="sm"
          >
            Sous le seuil
          </UiStatusPill>
          <span class="text-caption text-argent-600 md:hidden">{{ row.details }}</span>
        </span>
        <UiStepper
          :model-value="row.quantity"
          :label="row.stepLabel"
          :step="row.step"
          :disabled="sending"
          @update:model-value="adjust(row.id, row.quantity, $event)"
        >
          {{ row.quantityText }}
        </UiStepper>
        <span class="text-right font-mono text-note text-argent-600 max-md:hidden">{{ row.threshold }}</span>
        <UiProgressBar
          class="max-md:hidden"
          :value="row.level"
          :max="100"
          :label="row.levelLabel"
          :tone="row.levelTone"
          size="md"
        />
        <span class="text-sm text-sable-600 max-md:hidden">{{ row.bestBefore }}</span>
      </li>
    </ul>
  </div>
</template>
