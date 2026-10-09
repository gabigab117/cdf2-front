<script setup lang="ts">
// Rows, ids and other attributes fall through to the textarea.
const value = defineModel<string>({ default: '' })

const { invalid = false } = defineProps<{
  /** A value the API refused: the field shows it. */
  invalid?: boolean
}>()

const classes = {
  base: 'block min-h-24 w-full resize-y rounded-field border bg-white px-3.5 py-2.5 text-body text-sable-950 placeholder:text-argent-500',
  valid: 'border-argent-250',
  invalid: 'border-ambre-300',
}

const textareaClasses = computed(() => [classes.base, invalid ? classes.invalid : classes.valid])
</script>

<template>
  <textarea
    v-model="value"
    :aria-invalid="invalid || undefined"
    :class="textareaClasses"
  />
</template>
