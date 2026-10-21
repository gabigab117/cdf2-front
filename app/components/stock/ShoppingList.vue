<script setup lang="ts">
import type { components } from '~/types/api'

type ShoppingLineOut = components['schemas']['ShoppingLineOut']
type ShoppingListEstimatedCostOut = components['schemas']['ShoppingListEstimatedCostOut']

// « Liste de courses »: what brings each item below its threshold back to it,
// as the API counts it (A19), and its budget at the latest costs paid (D16).
// It is copied, or sent to the board as a note of logistics without event (A3,
// A11).
const { lines, estimatedCost } = defineProps<{
  lines: readonly ShoppingLineOut[]
  estimatedCost: ShoppingListEstimatedCostOut
}>()

const { quantity } = useQuantityFormat()
const { amount } = useMoneyFormat()
const { publishNote } = useNoteWrites()
const titleId = useId()

const rows = computed(() =>
  lines.map(({ item, quantity: toBuy, estimated_cost }) => ({
    id: item.id,
    name: item.name,
    quantity: quantity(toBuy, item.unit),
    estimatedCost: estimated_cost === null ? null : `≈ ${amount(estimated_cost)}`,
  })),
)
const itemsText = computed(() => countText(rows.value.length, 'article', 'articles'))

// The budget, once a purchase paid tells the cost of a line: « Budget estimé :
// 61,20 € », and the lines no cost tells.
const estimatedCostText = computed(() => {
  if (rows.value.every(row => row.estimatedCost === null)) return null
  const { total, unpriced_lines } = estimatedCost
  const unpriced = unpriced_lines > 0 ? ` (hors ${countText(unpriced_lines, 'article', 'articles')} sans prix)` : ''
  return `Budget estimé : ${amount(total)}${unpriced}`
})

// Copied, an item a line: « - Jus de fruits 1 L : 6 (≈ 7,20 €) », then the budget.
const copiedText = computed(() =>
  [
    'Liste de courses',
    ...rows.value.map(row => `- ${row.name} : ${row.quantity}${row.estimatedCost ? ` (${row.estimatedCost})` : ''}`),
    ...(estimatedCostText.value ? [estimatedCostText.value] : []),
  ].join('\n'),
)
// Sent, a single paragraph: the dashboard shows the first lines of a note. The
// budget follows in all, without each line's.
const noteText = computed(() =>
  `Liste de courses : ${rows.value.map(row => `${row.quantity} ${row.name}`).join(', ')}.${estimatedCostText.value ? ` ${estimatedCostText.value}.` : ''}`,
)

const copied = ref(false)
const sent = ref(false)
const sending = ref(false)
const failure = ref<string | null>(null)

// A list that changes, the stock having moved, is a list to copy or send again.
watch(() => lines, () => {
  copied.value = false
  sent.value = false
})

const copyLabel = computed(() => (copied.value ? 'Liste copiée' : 'Copier'))
const sendLabel = computed(() => (sent.value ? 'Envoyée au bureau' : 'Envoyer au bureau'))
// What screen readers hear once the list is copied or sent.
const announcement = computed(() => {
  if (sent.value) return 'La liste est publiée parmi les notes du tableau de bord.'
  return copied.value ? 'La liste est copiée.' : ''
})

async function copy(): Promise<void> {
  failure.value = null
  try {
    await navigator.clipboard.writeText(copiedText.value)
    copied.value = true
  }
  catch {
    failure.value = 'Le navigateur n’a pas permis de copier la liste.'
  }
}

async function send(): Promise<void> {
  failure.value = null
  sending.value = true
  const refusal = await publishNote({ event: null, text: noteText.value, tag: 'logistics', pinned: false })
  sending.value = false
  if (refusal) {
    failure.value = refusalText(refusal)
    return
  }
  sent.value = true
}
</script>

<template>
  <UiCard
    flush
    :aria-labelledby="titleId"
  >
    <div class="flex items-center justify-between gap-2.5 border-b border-argent-100 px-5 py-4.5">
      <h2
        :id="titleId"
        class="text-base font-semibold"
      >
        Liste de courses
      </h2>
      <span class="text-note text-argent-600">{{ itemsText }}</span>
    </div>
    <template v-if="rows.length > 0">
      <ul class="flex flex-col py-1.5">
        <li
          v-for="row in rows"
          :key="row.id"
          class="flex items-center justify-between gap-2.5 px-5 py-2.5 text-ui"
        >
          <span>{{ row.name }}</span>
          <span class="flex items-baseline gap-2.5 whitespace-nowrap">
            <span class="font-mono font-semibold">{{ row.quantity }}</span>
            <span
              v-if="row.estimatedCost"
              class="font-mono text-note text-argent-600"
            >{{ row.estimatedCost }}</span>
          </span>
        </li>
      </ul>
      <p
        v-if="estimatedCostText"
        class="border-t border-argent-100 px-5 pt-3 text-ui font-medium"
      >
        {{ estimatedCostText }}
      </p>
      <div class="flex gap-2 px-5 pt-3 pb-4.5">
        <UiButton
          variant="secondary"
          size="sm"
          class="flex-1"
          @click="copy"
        >
          {{ copyLabel }}
        </UiButton>
        <UiButton
          size="sm"
          class="flex-1"
          :loading="sending"
          :disabled="sent"
          @click="send"
        >
          {{ sendLabel }}
        </UiButton>
      </div>
    </template>
    <p
      v-else
      class="px-5 py-4 text-sm text-argent-600"
    >
      Rien à racheter : tous les articles sont au-dessus de leur seuil.
    </p>
    <p
      v-if="failure"
      role="alert"
      class="px-5 pb-3 text-note text-ambre-800"
    >
      {{ failure }}
    </p>
    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ announcement }}
    </p>
    <p class="px-5 pb-4 text-caption text-argent-600">
      Quantités calculées pour revenir au seuil.
    </p>
  </UiCard>
</template>
