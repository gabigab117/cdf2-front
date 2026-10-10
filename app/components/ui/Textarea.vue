<script setup lang="ts">
// Rows, ids and other attributes fall through to the textarea: its height
// follows its rows.
const value = defineModel<string>({ default: '' })

const { invalid = false, bare = false } = defineProps<{
  /** A value the API refused: the field shows it. */
  invalid?: boolean
  /** Without a frame of its own, inside a card that frames it: the input zone of the notes. */
  bare?: boolean
}>()

const classes = {
  base: 'block w-full text-body text-sable-950 placeholder:text-argent-500',
  framed: 'resize-y rounded-field border bg-white px-3.5 py-2.5',
  bare: 'resize-none bg-transparent px-5 pt-4.5 pb-2 leading-normal',
  valid: 'border-argent-250',
  invalid: 'border-ambre-300',
}

const textareaClasses = computed(() => [
  classes.base,
  bare ? classes.bare : [classes.framed, invalid ? classes.invalid : classes.valid],
])
</script>

<template>
  <textarea
    v-model="value"
    :aria-invalid="invalid || undefined"
    :class="textareaClasses"
  />
</template>
