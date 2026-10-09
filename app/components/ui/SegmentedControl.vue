<script setup lang="ts" generic="T extends string">
const selected = defineModel<T>({ required: true })

const { options, label } = defineProps<{
  options: ReadonlyArray<{ value: T, label: string }>
  /** What the choice is about, for screen readers. */
  label: string
}>()

// Radio buttons of one name: the arrow keys move between options, as the browser
// does for any group of radio buttons.
const name = useId()
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="inline-grid auto-cols-fr grid-flow-col gap-1 rounded-search bg-argent-100 p-1"
  >
    <label
      v-for="option in options"
      :key="option.value"
      class="flex h-9.5 cursor-pointer items-center justify-center rounded-control px-4 text-sm font-semibold whitespace-nowrap text-argent-600 transition-colors has-checked:bg-white has-checked:text-sable-950 has-checked:shadow-segment has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-azur-600"
    >
      <input
        v-model="selected"
        type="radio"
        class="sr-only"
        :name
        :value="option.value"
      >
      {{ option.label }}
    </label>
  </div>
</template>
