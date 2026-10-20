<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { LineFields } from '~/utils/stock'

type OrderLineOut = components['schemas']['OrderLineOut']
type StockOrderOut = components['schemas']['StockOrderOut']

// The form of the lines of an order: the items come from the stock, read once
// the form opens.
const { id, lines } = defineProps<{
  /** The id of the order's document. */
  id: number
  /** The lines as they stand. */
  lines: readonly OrderLineOut[]
}>()

const emit = defineEmits<{ saved: [order: StockOrderOut], cancel: [] }>()

const { data: stock } = useStock()
const { writeOrderLines } = useStockWrites()

const fields = ref<LineFields[]>(orderLineFields(lines))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const itemOptions = computed(() => (stock.value?.items ?? []).map(({ item }) => ({ value: item.id, label: item.name })))

const form = useTemplateRef<HTMLFormElement>('form')

// A line removed: its errors, placed by position, no longer fit.
function forgetErrors(): void {
  errors.value = null
}

async function save(): Promise<void> {
  pending.value = true
  const result = await writeOrderLines(id, fields.value)
  pending.value = false
  if (!result.errors) {
    emit('saved', result.data)
    return
  }
  const shown = new Set(fields.value.flatMap((_line, index) => [`lines.${index}.item`, `lines.${index}.quantity`]))
  errors.value = placeErrors(result.errors, shown, path => path)
  await focusErrors(form)
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-3"
    @submit.prevent="save"
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
    <StockLines
      v-model="fields"
      :items="itemOptions"
      :errors="errors?.fields ?? {}"
      @restructured="forgetErrors"
    />
    <div class="flex flex-wrap gap-2">
      <UiButton
        type="submit"
        size="sm"
        :loading="pending"
      >
        Enregistrer les lignes
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
