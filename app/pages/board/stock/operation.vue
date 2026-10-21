<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { Option } from '~/utils/options'
import type { LineFields } from '~/utils/stock'

type StockDirection = components['schemas']['StockDirection']
type StockOperationIn = components['schemas']['StockOperationIn']

definePageMeta({ path: '/bureau/stock/entree-sortie' })

useHead({ title: 'Entrée ou sortie' })

const breadcrumb = [{ label: 'Stock', to: STOCK_PATH }, { label: 'Entrée ou sortie' }]

// The items come from the stock, which tells what each holds.
const { data: stock } = useStock()
const { recordOperation } = useStockWrites()
const { quantity } = useQuantityFormat()
const eventOptions = useEventChoices('Aucun')

const DIRECTIONS: readonly Option<StockDirection>[] = [
  { value: 'in', label: 'Entrée' },
  { value: 'out', label: 'Sortie' },
]

const direction = ref<StockDirection>('in')
const reason = ref<StockOperationIn['reason']>('purchase')
const label = ref('')
const event = ref<number | null>(null)
const lines = ref<LineFields[]>([newLine()])
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

// A purchase comes in, a consumption goes out, an adjustment either way: the
// reason follows the direction chosen.
const reasons = computed(() => DIRECTION_REASONS[direction.value].map(value => ({ value, label: STOCK_REASONS[value] })))
watch(direction, (chosen) => {
  if (!DIRECTION_REASONS[chosen].includes(reason.value)) reason.value = DIRECTION_REASONS[chosen][0]!
})

const itemOptions = computed(() => (stock.value?.items ?? []).map(({ item }) => ({ value: item.id, label: item.name })))

// A purchase tells what each of its lines cost (D16).
const costs = computed(() => reason.value === 'purchase')

// Under each item, what the stock holds of it.
function held(id: number): string | undefined {
  const entry = stock.value?.items.find(({ item }) => item.id === id)
  return entry && `En stock : ${quantity(entry.quantity, entry.item.unit)}`
}

const form = useTemplateRef<HTMLFormElement>('form')

// A line removed: its errors, placed by position, no longer fit.
function forgetErrors(): void {
  errors.value = null
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await recordOperation({
    direction: direction.value,
    reason: reason.value,
    label: label.value,
    event: event.value,
    lines: linesPayload(lines.value, { costs: costs.value }),
  })
  pending.value = false
  if (!result.errors) {
    await navigateTo(STOCK_PATH)
    return
  }
  const lineFields = costs.value ? ['item', 'quantity', 'cost'] : ['item', 'quantity']
  const shown = new Set([
    'reason',
    'label',
    'event',
    ...lines.value.flatMap((_line, index) => lineFields.map(field => `lines.${index}.${field}`)),
  ])
  errors.value = placeErrors(result.errors, shown, operationFieldLabel)
  await focusErrors(form)
}
</script>

<template>
  <div class="flex max-w-160 flex-col gap-5.5">
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <BoardPageTitle>Entrée ou sortie</BoardPageTitle>
    <UiCard>
      <form
        ref="form"
        class="flex flex-col gap-4"
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
        <UiSegmentedControl
          v-model="direction"
          :options="DIRECTIONS"
          label="Sens"
          class="self-start"
        />
        <div class="grid gap-3 md:grid-cols-2">
          <UiField
            v-slot="{ control }"
            label="Motif"
            :errors="errors?.fields.reason"
          >
            <UiSelect
              v-bind="control"
              v-model="reason"
              :options="reasons"
            />
          </UiField>
          <UiField
            v-slot="{ control }"
            label="Événement"
            optional
            :errors="errors?.fields.event"
          >
            <UiSelect
              v-bind="control"
              v-model="event"
              :options="eventOptions"
            />
          </UiField>
        </div>
        <UiField
          v-slot="{ control }"
          label="Libellé"
          optional
          :errors="errors?.fields.label"
        >
          <UiInput
            v-bind="control"
            v-model="label"
            placeholder="Ex. Courses buvette"
          />
        </UiField>
        <StockLines
          v-model="lines"
          :items="itemOptions"
          :errors="errors?.fields ?? {}"
          :hint="held"
          :costs
          @restructured="forgetErrors"
        />
        <div class="flex flex-wrap items-center gap-2">
          <UiButton
            type="submit"
            :loading="pending"
          >
            Enregistrer
          </UiButton>
          <UiButton
            variant="secondary"
            :to="STOCK_PATH"
          >
            Annuler
          </UiButton>
        </div>
      </form>
    </UiCard>
  </div>
</template>
