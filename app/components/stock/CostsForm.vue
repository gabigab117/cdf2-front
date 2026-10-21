<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type StockCostIn = components['schemas']['StockCostIn']
type StockOperationDetailOut = components['schemas']['StockOperationDetailOut']

// What each line of a purchase or a delivery cost (D16), as on its ticket or
// its invoice, every line at once: « Compléter les prix », « Corriger les
// prix » on its page, and « Achat déjà saisi » on the page of the expense that
// paid it, where every cost is required.
const { operation, save, submitLabel, required = false, fieldLabel } = defineProps<{
  operation: StockOperationDetailOut
  /** Sends the costs: the errors to show, or null once they are written. */
  save: (lines: StockCostIn[]) => Promise<FormErrors | null>
  submitLabel: string
  /** Every line needs its cost, as an expense pays them all. */
  required?: boolean
  /** The name of a field the form does not show, before its error. */
  fieldLabel?: (path: string) => string
}>()

const emit = defineEmits<{ cancel: [] }>()

// The fields of a line the API may refuse, under its position.
const LINE_FIELDS = ['item', 'cost']

const COST_HELP = 'Le montant est celui de la ligne, TTC, comme sur le ticket ou la facture.'

const { signedQuantity } = useQuantityFormat()

// What a member typed for each line, in their order, as its field holds it.
const costs = ref(operation.lines.map(line => (line.cost === null ? '' : amountField(line.cost))))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const rows = computed(() =>
  operation.lines.map((line, index) => ({
    index,
    name: line.item.name,
    quantity: signedQuantity(line.delta, line.item.unit),
  })),
)
const help = computed(() => (required ? COST_HELP : `${COST_HELP} Laissé vide, il reste à compléter.`))

function lineErrors(index: number): readonly string[] | undefined {
  const found = LINE_FIELDS.flatMap(field => errors.value?.fields[`lines.${index}.${field}`] ?? [])
  return found.length > 0 ? found : undefined
}

const form = useTemplateRef<HTMLFormElement>('form')

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(operation.lines.map((line, index) => ({ item: line.item.id, cost: amountInput(costs.value[index] ?? '') })))
  pending.value = false
  if (!result) return
  const shown = new Set(linePaths(operation.lines, LINE_FIELDS))
  errors.value = placeErrors(result, shown, fieldLabel)
  await focusErrors(form)
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-3"
    @submit.prevent="submit"
  >
    <UiAlert
      v-if="errors?.form.length"
      tabindex="-1"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiAlert>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="row in rows"
        :key="row.index"
        class="flex flex-wrap items-start justify-between gap-3 py-3"
      >
        <span class="flex min-w-0 flex-col gap-0.5 pt-2">
          <span class="text-ui font-semibold text-sable-950">{{ row.name }}</span>
          <span class="text-caption text-argent-600">{{ row.quantity }}</span>
        </span>
        <UiField
          v-slot="{ control }"
          :label="`Montant payé : ${row.name}`"
          hidden-label
          class="w-32"
          :errors="lineErrors(row.index)"
        >
          <UiInput
            v-bind="control"
            v-model="costs[row.index]"
            inputmode="decimal"
            placeholder="Montant €"
            :required
          />
        </UiField>
      </li>
    </ul>
    <p class="text-note text-argent-600">
      {{ help }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        {{ submitLabel }}
      </UiButton>
      <UiButton
        variant="secondary"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
    </div>
  </form>
</template>
