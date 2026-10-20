<script setup lang="ts">
import type { components } from '~/types/api'

type StockOrderOut = components['schemas']['StockOrderOut']

// The lines of an order, each an item of the stock and how much of it comes:
// before the assistant, a member enters them from the order (A19). Validated
// with its lines, the order waits on the Stock page to be received; received,
// its lines no longer change.
const { id, validated } = defineProps<{
  /** The id of the order's document. */
  id: number
  /** The order is validated: the panel knows it before its lines are read again. */
  validated: boolean
}>()

const { data: order, error, refresh } = useStockOrder(id)
const { calendarNumeric } = useDateFormat()
const titleId = useId()

const editing = ref(false)

const hasLines = computed(() => (order.value?.lines.length ?? 0) > 0)
// Received, the lines stay as they are.
const editable = computed(() => !editing.value && order.value?.delivery === null)
const editLabel = computed(() => (hasLines.value ? 'Modifier' : 'Ajouter des lignes'))

// Where the order stands with the stock.
const state = computed(() => {
  const delivery = order.value?.delivery
  if (delivery) return `Réceptionnée le ${calendarNumeric(parisDate(delivery.created_at))} : ajoutée au stock.`
  if (!hasLines.value) return 'Aucune ligne de stock : la commande n’ajoute rien au stock.'
  return validated ? 'À réceptionner depuis la page Stock.' : 'Validez la commande pour la réceptionner depuis la page Stock.'
})

function saved(written: StockOrderOut): void {
  order.value = written
  editing.value = false
}
</script>

<template>
  <section
    class="flex flex-col gap-3 border-t border-argent-100 pt-4"
    :aria-labelledby="titleId"
  >
    <div class="flex items-center justify-between gap-3">
      <h3
        :id="titleId"
        class="text-label font-semibold text-sable-600"
      >
        Lignes de commande
      </h3>
      <UiButton
        v-if="editable"
        variant="link"
        @click="editing = true"
      >
        {{ editLabel }}
      </UiButton>
    </div>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <DocumentsOrderLinesForm
      v-else-if="editing && order"
      :id
      :lines="order.lines"
      @saved="saved"
      @cancel="editing = false"
    />
    <template v-else-if="order">
      <StockOrderLineList
        v-if="hasLines"
        :lines="order.lines"
        class="text-ui"
      />
      <p class="text-note text-argent-600">
        {{ state }}
      </p>
    </template>
  </section>
</template>
