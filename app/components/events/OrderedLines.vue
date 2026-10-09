<script setup lang="ts" generic="T extends { key: number }">
import { ArrowDown, ArrowUp, Plus, X } from '@lucide/vue'

// The lines of a list the board writes in display order, such as the programme:
// each moves up or down, or goes; the fields of a line come through the slot.
const lines = defineModel<T[]>({ required: true })

const { newLine, addLabel } = defineProps<{
  /** A blank line, added at the end of the list. */
  newLine: () => T
  addLabel: string
}>()

// The lines changed places: whatever was said of a line by its position no
// longer is.
const emit = defineEmits<{ restructured: [] }>()

const id = useId()

function labelId(index: number): string {
  return `${id}-line-${index}`
}

function move(index: number, offset: -1 | 1): void {
  const moved = [...lines.value]
  const [line] = moved.splice(index, 1)
  if (!line) return
  moved.splice(index + offset, 0, line)
  lines.value = moved
  emit('restructured')
}

function remove(index: number): void {
  lines.value = lines.value.filter((_, position) => position !== index)
  emit('restructured')
}

function add(): void {
  lines.value = [...lines.value, newLine()]
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <ol
      v-if="lines.length > 0"
      class="flex flex-col gap-3"
    >
      <li
        v-for="(line, index) in lines"
        :key="line.key"
        role="group"
        :aria-labelledby="labelId(index)"
        class="flex flex-col gap-3 rounded-search bg-argent-50 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <span
            :id="labelId(index)"
            class="text-label font-semibold text-sable-600"
          >Ligne {{ index + 1 }}</span>
          <span class="flex gap-1.5">
            <UiIconButton
              size="sm"
              :label="`Monter : ligne ${index + 1}`"
              :disabled="index === 0"
              @click="move(index, -1)"
            >
              <ArrowUp :size="16" />
            </UiIconButton>
            <UiIconButton
              size="sm"
              :label="`Descendre : ligne ${index + 1}`"
              :disabled="index === lines.length - 1"
              @click="move(index, 1)"
            >
              <ArrowDown :size="16" />
            </UiIconButton>
            <UiIconButton
              size="sm"
              :label="`Retirer : ligne ${index + 1}`"
              @click="remove(index)"
            >
              <X :size="16" />
            </UiIconButton>
          </span>
        </div>
        <slot
          :line
          :index
        />
      </li>
    </ol>
    <UiButton
      variant="dashed"
      size="sm"
      class="self-start"
      @click="add"
    >
      <Plus :size="16" />
      {{ addLabel }}
    </UiButton>
  </div>
</template>
