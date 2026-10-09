<script setup lang="ts">
// Type, autocomplete, ids and other attributes fall through to the input.
const value = defineModel<string>({ default: '' })

const { invalid = false } = defineProps<{
  /** A value the API refused: the field shows it. */
  invalid?: boolean
}>()

const classes = {
  base: 'h-11.5 w-full rounded-field border bg-white px-3.5 text-body text-sable-950 placeholder:text-argent-500',
  valid: 'border-argent-250',
  invalid: 'border-ambre-300',
}

const inputClasses = computed(() => [classes.base, invalid ? classes.invalid : classes.valid])
</script>

<template>
  <input
    v-model="value"
    :aria-invalid="invalid || undefined"
    :class="inputClasses"
  >
</template>
