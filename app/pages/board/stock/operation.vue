<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
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
const events = useEventChoices()

const DIRECTIONS: ReadonlyArray<{ value: StockDirection, label: string }> = [
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
// reason follows the way chosen.
const reasons = computed(() => ENTRY_REASONS[direction.value].map(value => ({ value, label: STOCK_REASONS[value] })))
watch(direction, (way) => {
  if (!ENTRY_REASONS[way].includes(reason.value)) reason.value = ENTRY_REASONS[way][0]!
})

const eventOptions = computed(() => [{ value: null, label: 'Aucun' }, ...events.value])
const itemOptions = computed(() => (stock.value?.items ?? []).map(({ item }) => ({ value: item.id, label: item.name })))

// Under each item, what the stock holds of it.
function held(id: number): string | undefined {
  const entry = stock.value?.items.find(({ item }) => item.id === id)
  return entry && `En stock : ${quantity(entry.quantity, entry.item.unit)}`
}

const form = useTemplateRef<HTMLFormElement>('form')

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

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
    lines: linesPayload(lines.value),
  })
  pending.value = false
  if (!result.errors) {
    await navigateTo(STOCK_PATH)
    return
  }
  const shown = new Set([
    'reason',
    'label',
    'event',
    ...lines.value.flatMap((_line, index) => [`lines.${index}.item`, `lines.${index}.quantity`]),
  ])
  errors.value = placeErrors(result.errors, shown, operationFieldLabel)
  await nextTick()
  form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
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
        <UiCallout
          v-if="errors?.form.length"
          tone="ambre"
          role="alert"
          tabindex="-1"
          :icon="CircleAlert"
        >
          <p
            v-for="message in errors.form"
            :key="message"
          >
            {{ message }}
          </p>
        </UiCallout>
        <UiSegmentedControl
          v-model="direction"
          :options="DIRECTIONS"
          label="Sens"
          class="self-start"
        />
        <div class="grid gap-3 md:grid-cols-2">
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Motif"
            :errors="fieldErrors('reason')"
          >
            <UiSelect
              :id
              v-model="reason"
              :options="reasons"
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Événement"
            optional
            :errors="fieldErrors('event')"
          >
            <UiSelect
              :id
              v-model="event"
              :options="eventOptions"
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
        </div>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Libellé"
          optional
          :errors="fieldErrors('label')"
        >
          <UiInput
            :id
            v-model="label"
            placeholder="Ex. Courses buvette"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <StockLines
          v-model="lines"
          :items="itemOptions"
          :errors="errors?.fields ?? {}"
          :hint="held"
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
