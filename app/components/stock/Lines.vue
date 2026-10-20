<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import type { LineFields } from '~/utils/stock'

// The lines of an entry, an exit or an order: each an item and how much of it.
// A line holds on one row; on a phone, its quantity and its cross go under its
// item.
const lines = defineModel<LineFields[]>({ required: true })

const { items, errors, hint } = defineProps<{
  /** The items to choose from, by name. */
  items: ReadonlyArray<{ value: number, label: string }>
  /** What the API found wrong, by the path of a line's field: "lines.0.quantity". */
  errors: Readonly<Record<string, readonly string[]>>
  /** What a line tells under its item, such as what is in stock. */
  hint?: (item: number) => string | undefined
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
        v-slot="{ id, describedby, invalid }"
        :label="`Article de la ligne ${index + 1}`"
        hidden-label
        :help="lineHint(line)"
        class="min-w-48 flex-1"
        :errors="lineErrors(index, 'item')"
      >
        <UiSelect
          :id
          v-model="line.item"
          :options="items"
          placeholder="Choisir un article"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <div class="flex items-start gap-2">
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="`Quantité de la ligne ${index + 1}`"
          hidden-label
          class="w-28"
          :errors="lineErrors(index, 'quantity')"
        >
          <UiInput
            :id
            v-model="line.quantity"
            inputmode="decimal"
            placeholder="Quantité"
            required
            :aria-describedby="describedby"
            :invalid
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
  </fieldset>
</template>
