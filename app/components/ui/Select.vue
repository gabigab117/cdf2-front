<script setup lang="ts" generic="T extends string | number | null">
import { ChevronDown } from '@lucide/vue'

// Ids, required and the descriptions fall through to the select, not to its frame.
defineOptions({ inheritAttrs: false })

const selected = defineModel<T>({ required: true })

const { options, placeholder, invalid = false } = defineProps<{
  options: ReadonlyArray<{ value: T, label: string }>
  /** Shown while nothing is chosen: a required select is not sent so. */
  placeholder?: string
  /** A value the API refused: the field shows it. */
  invalid?: boolean
}>()

const classes = {
  base: 'h-11.5 w-full appearance-none rounded-field border bg-white pr-10 pl-3.5 text-ui text-sable-950',
  valid: 'border-argent-250',
  invalid: 'border-ambre-300',
}

const selectClasses = computed(() => [classes.base, invalid ? classes.invalid : classes.valid])
</script>

<template>
  <div class="relative">
    <select
      v-model="selected"
      v-bind="$attrs"
      :aria-invalid="invalid || undefined"
      :class="selectClasses"
    >
      <!--
        A static empty value: bound to null, Vue would drop the attribute, the
        browser would take the label for the value, and `required` would let
        the select go unchosen.
      -->
      <option
        v-if="placeholder"
        value=""
        disabled
      >
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="String(option.value)"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <ChevronDown
      :size="16"
      aria-hidden="true"
      class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-argent-600"
    />
  </div>
</template>
