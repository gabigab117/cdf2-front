<script setup lang="ts">
import type { components } from '~/types/api'

type ShoppingLineOut = components['schemas']['ShoppingLineOut']

// « Liste de courses »: what brings each item below its threshold back to twice
// its threshold, as the API counts it (A19). It is copied, or sent to the board
// as a note of logistics without event (A3, A11).
const { lines } = defineProps<{ lines: readonly ShoppingLineOut[] }>()

const { quantity } = useQuantityFormat()
const { publishNote } = useNoteWrites()
const titleId = useId()

const rows = computed(() =>
  lines.map(({ item, quantity: toBuy }) => ({ id: item.id, name: item.name, quantity: quantity(toBuy, item.unit) })),
)
const countText = computed(() => `${rows.value.length} ${rows.value.length > 1 ? 'articles' : 'article'}`)

// Copied, an item a line: « - Jus de fruits 1 L : 30 ».
const copiedText = computed(() =>
  ['Liste de courses', ...rows.value.map(row => `- ${row.name} : ${row.quantity}`)].join('\n'),
)
// Sent, a single paragraph: the dashboard shows the first lines of a note.
const noteText = computed(() =>
  `Liste de courses : ${rows.value.map(row => `${row.quantity} ${row.name}`).join(', ')}.`,
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
      <span class="text-note text-argent-600">{{ countText }}</span>
    </div>
    <template v-if="rows.length > 0">
      <ul class="flex flex-col py-1.5">
        <li
          v-for="row in rows"
          :key="row.id"
          class="flex items-center justify-between gap-2.5 px-5 py-2.5 text-ui"
        >
          <span>{{ row.name }}</span>
          <span class="font-mono font-semibold whitespace-nowrap">{{ row.quantity }}</span>
        </li>
      </ul>
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
          variant="primary"
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
      Quantités calculées pour revenir au double du seuil.
    </p>
  </UiCard>
</template>
