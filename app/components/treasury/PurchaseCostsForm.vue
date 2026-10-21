<script setup lang="ts">
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type StockCostIn = components['schemas']['StockCostIn']

// The costs of the purchase an expense pays (D16), each required: given to
// link it (« Achat déjà saisi »), or again to correct them. Its lines are read
// from the stock.
const { entry, operation, submitLabel } = defineProps<{
  entry: LedgerEntryOut
  /** The id of the purchase or the delivery. */
  operation: number
  submitLabel: string
}>()

const emit = defineEmits<{ saved: [entry: LedgerEntryOut], cancel: [] }>()

const { data: detail, error, refresh } = useStockOperation(() => operation)
const { linkExistingPurchase } = useTreasuryWrites()

// The purchase chosen, which the costs form does not show.
function fieldLabel(path: string): string {
  return path === 'operation' ? 'Achat' : path
}

async function save(lines: StockCostIn[]) {
  // Each cost is required: one left empty goes as typed, and the API refuses
  // it under its line.
  const costs = lines.map(({ item, cost }) => ({ item, cost: cost ?? '' }))
  const result = await linkExistingPurchase(entry.id, { operation, lines: costs })
  if (result.errors) return result.errors
  emit('saved', result.data)
  return null
}
</script>

<template>
  <StockCostsForm
    v-if="detail"
    :operation="detail"
    :save
    :submit-label
    :field-label
    required
    @cancel="emit('cancel')"
  />
  <div
    v-else
    class="flex flex-col gap-3"
  >
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <UiButton
      variant="secondary"
      size="sm"
      class="self-start"
      @click="emit('cancel')"
    >
      Annuler
    </UiButton>
  </div>
</template>
