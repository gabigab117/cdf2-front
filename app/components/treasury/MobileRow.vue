<script setup lang="ts" generic="T extends string | number | null">
import { ChevronRight } from '@lucide/vue'

// A row of the expense entered on a phone, as the mockup draws it: its name
// above its field, without a frame; a list to choose from, with a chevron.
const value = defineModel<T>({ required: true })

const { label, options, type = 'text', max, maxlength } = defineProps<{
  label: string
  /** The choices of a list, in place of a field to type in. */
  options?: ReadonlyArray<{ value: T, label: string }>
  type?: 'text' | 'date'
  /** The latest day a date may be. */
  max?: string
  maxlength?: number
}>()

const classes = {
  row: 'flex min-h-14 items-center gap-3 border-b border-argent-100 px-4 py-2.5 last:border-b-0 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-azur-600',
  field: 'w-full appearance-none bg-transparent font-medium text-sable-950 focus-visible:outline-none',
}

const id = useId()
</script>

<template>
  <div :class="classes.row">
    <div class="flex min-w-0 flex-1 flex-col leading-snug">
      <label
        :for="id"
        class="text-caption text-argent-600"
      >{{ label }}</label>
      <select
        v-if="options"
        :id
        v-model="value"
        :class="classes.field"
      >
        <option
          v-for="option in options"
          :key="String(option.value)"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <input
        v-else
        :id
        v-model="value"
        :type
        :max
        :maxlength
        autocomplete="off"
        :class="classes.field"
      >
    </div>
    <ChevronRight
      v-if="options"
      :size="18"
      class="shrink-0 text-argent-400"
      aria-hidden="true"
    />
  </div>
</template>
