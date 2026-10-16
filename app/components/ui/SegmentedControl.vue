<script setup lang="ts" generic="T extends string">
const selected = defineModel<T>({ required: true })

const { options, label, size = 'md' } = defineProps<{
  /** An option in azur reads so once chosen, as the income of the treasury. */
  options: ReadonlyArray<{ value: T, label: string, tone?: 'azur' }>
  /** What the choice is about, for screen readers. */
  label: string
  /** 38 px high, or 44 px on a form made for a phone. */
  size?: 'md' | 'lg'
}>()

const classes = {
  option: 'flex cursor-pointer items-center justify-center px-4 text-sm font-semibold whitespace-nowrap text-argent-600 transition-colors has-checked:bg-white has-checked:shadow-segment has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-azur-600',
  size: {
    md: 'h-9.5 rounded-control',
    lg: 'h-11 rounded-field',
  },
  plain: 'has-checked:text-sable-950',
  azur: 'has-checked:text-azur-700',
}

function optionClasses(tone?: 'azur'): string[] {
  return [classes.option, classes.size[size], tone === 'azur' ? classes.azur : classes.plain]
}

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
      :class="optionClasses(option.tone)"
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
