<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { LineFields } from '~/utils/stock'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// « Mettre en stock » (D16): the purchase an expense paid, recorded in the
// stock with the expense's label and event, each line with what it cost.
const { entry } = defineProps<{ entry: LedgerEntryOut }>()

const emit = defineEmits<{ saved: [entry: LedgerEntryOut], cancel: [] }>()

// The fields of a line the API may refuse, under its position.
const LINE_FIELDS = ['item', 'quantity', 'cost']

const { items, held } = useStockItemChoices()
const { createStockPurchase } = useTreasuryWrites()

const lines = ref<LineFields[]>([newLine()])
const errors = ref<FormErrors | null>(null)
const pending = ref(false)
const form = useTemplateRef<HTMLFormElement>('form')

// A line removed: its errors, placed by position, no longer fit.
function forgetErrors(): void {
  errors.value = null
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await createStockPurchase(entry.id, lines.value)
  pending.value = false
  if (!result.errors) {
    emit('saved', result.data)
    return
  }
  const shown = new Set(linePaths(lines.value, LINE_FIELDS))
  errors.value = placeErrors(result.errors, shown)
  await focusErrors(form)
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-3.5"
    @submit.prevent="submit"
  >
    <UiCallout
      tone="ambre"
      :icon="TriangleAlert"
    >
      <p>Les quantités entrent dans le stock aujourd’hui. Si ces articles y sont déjà, choisissez « Achat déjà saisi ».</p>
    </UiCallout>
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
    <StockLines
      v-model="lines"
      :items
      :errors="errors?.fields ?? {}"
      :hint="held"
      costs
      costs-required
      @restructured="forgetErrors"
    />
    <div class="flex flex-wrap gap-2">
      <UiButton
        type="submit"
        variant="accent"
        size="sm"
        :loading="pending"
      >
        Mettre en stock
      </UiButton>
      <UiButton
        variant="secondary"
        size="sm"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
    </div>
  </form>
</template>
