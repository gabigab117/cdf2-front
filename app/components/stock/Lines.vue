<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import type { Option } from '~/utils/options'
import type { LineFields } from '~/utils/stock'

// The lines of an entry, an exit or an order: each an item and how much of it,
// and, for a purchase, what it cost. A line holds on one row; on a phone, its
// figures and its cross go under its item.
const lines = defineModel<LineFields[]>({ required: true })

const { items, errors, hint, costs, costsRequired } = defineProps<{
  /** The items to choose from, by name. */
  items: readonly Option<number>[]
  /** What the API found wrong, by the path of a line's field: "lines.0.quantity". */
  errors: Readonly<Record<string, readonly string[]>>
  /** What a line tells under its item, such as what is in stock. */
  hint?: (item: number) => string | undefined
  /** Lines of a purchase: each tells what it cost (D16). */
  costs?: boolean
  /** Each cost required, as an expense pays them all. */
  costsRequired?: boolean
}>()

// The lines changed places: whatever was said of a line by its position no
// longer is.
const emit = defineEmits<{ restructured: [] }>()

function add(): void {
  lines.value = [...lines.value, newLine()]
}

function remove(index: number): void {
  lines.value = lines.value.filter((_line, position) => position !== index)
  emit('restructured')
}

function lineErrors(index: number, field: string): readonly string[] | undefined {
  return errors[`lines.${index}.${field}`]
}

function lineHint(line: LineFields): string | undefined {
  return line.item === '' ? undefined : hint?.(line.item)
}

const COST_HELP = 'Le montant est celui de la ligne, TTC, comme sur le ticket.'

const costsHelp = computed(() => (costsRequired ? COST_HELP : `${COST_HELP} Laissé vide, il reste à compléter.`))
</script>

<template>
  <fieldset class="flex flex-col gap-3">
    <legend class="mb-1.5 text-label font-semibold text-sable-600">
      Articles
    </legend>
    <div
      v-for="(line, index) in lines"
      :key="index"
      class="flex flex-wrap items-start gap-2"
    >
      <UiField
        v-slot="{ control }"
        :label="`Article de la ligne ${index + 1}`"
        hidden-label
        :help="lineHint(line)"
        class="min-w-48 flex-1"
        :errors="lineErrors(index, 'item')"
      >
        <UiSelect
          v-bind="control"
          v-model="line.item"
          :options="items"
          placeholder="Choisir un article"
          required
        />
      </UiField>
      <div class="flex items-start gap-2">
        <UiField
          v-slot="{ control }"
          :label="`Quantité de la ligne ${index + 1}`"
          hidden-label
          class="w-28"
          :errors="lineErrors(index, 'quantity')"
        >
          <UiInput
            v-bind="control"
            v-model="line.quantity"
            inputmode="decimal"
            placeholder="Quantité"
            required
          />
        </UiField>
        <UiField
          v-if="costs"
          v-slot="{ control }"
          :label="`Montant payé de la ligne ${index + 1}`"
          hidden-label
          class="w-32"
          :errors="lineErrors(index, 'cost')"
        >
          <UiInput
            v-bind="control"
            v-model="line.cost"
            inputmode="decimal"
            placeholder="Montant €"
            :required="costsRequired"
          />
        </UiField>
        <UiIconButton
          :label="`Retirer la ligne ${index + 1}`"
          @click="remove(index)"
        >
          <X :size="16" />
        </UiIconButton>
      </div>
    </div>
    <UiButton
      variant="dashed"
      size="sm"
      class="self-start"
      @click="add"
    >
      <Plus :size="16" />
      Ajouter un article
    </UiButton>
    <p
      v-if="costs"
      class="text-note text-argent-600"
    >
      {{ costsHelp }}
    </p>
  </fieldset>
</template>
