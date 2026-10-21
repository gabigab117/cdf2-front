<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type StockOperationDetailOut = components['schemas']['StockOperationDetailOut']

// « Compléter les prix », « Corriger les prix » (D16): what each line of a
// purchase or a delivery cost, as on its ticket or its invoice, every line at
// once. A cost left empty waits.
const { operation } = defineProps<{ operation: StockOperationDetailOut }>()

const emit = defineEmits<{ saved: [operation: StockOperationDetailOut], cancel: [] }>()

// The fields of a line the API may refuse, under its position.
const LINE_FIELDS = ['item', 'cost']

const { updateCosts } = useStockWrites()
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

function lineErrors(index: number): readonly string[] | undefined {
  const found = LINE_FIELDS.flatMap(field => errors.value?.fields[`lines.${index}.${field}`] ?? [])
  return found.length > 0 ? found : undefined
}

const form = useTemplateRef<HTMLFormElement>('form')

async function submit(): Promise<void> {
  pending.value = true
  const result = await updateCosts(
    operation.id,
    operation.lines.map((line, index) => ({ item: line.item.id, cost: amountInput(costs.value[index] ?? '') })),
  )
  pending.value = false
  if (!result.errors) {
    emit('saved', result.data)
    return
  }
  const shown = new Set(operation.lines.flatMap((_line, index) => LINE_FIELDS.map(field => `lines.${index}.${field}`)))
  errors.value = placeErrors(result.errors, shown)
  await focusErrors(form)
}
</script>

<template>
  <UiCard
    title="Prix des lignes"
    flush
  >
    <form
      ref="form"
      class="flex flex-col"
      @submit.prevent="submit"
    >
      <UiAlert
        v-if="errors?.form.length"
        tabindex="-1"
        class="mx-5.5 mt-4"
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
          class="flex flex-wrap items-start justify-between gap-3 px-5.5 py-3"
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
            />
          </UiField>
        </li>
      </ul>
      <p class="border-t border-argent-100 px-5.5 pt-3 text-note text-argent-600">
        Le montant est celui de la ligne, TTC, comme sur le ticket ou la facture. Laissé vide, il reste à compléter.
      </p>
      <div class="flex flex-wrap items-center gap-2 px-5.5 pt-3 pb-4.5">
        <UiButton
          type="submit"
          :loading="pending"
        >
          Enregistrer les prix
        </UiButton>
        <UiButton
          variant="secondary"
          @click="emit('cancel')"
        >
          Annuler
        </UiButton>
      </div>
    </form>
  </UiCard>
</template>
