<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue'

const quantity = defineModel<number>({ required: true })

const { label, min = 0, max = Number.POSITIVE_INFINITY, step = 1, invalid = false } = defineProps<{
  /** What is counted, which names the buttons for screen readers. */
  label: string
  min?: number
  max?: number
  step?: number
  /** A quantity the API refused, such as more than is free. */
  invalid?: boolean
}>()

const atMin = computed(() => quantity.value <= min)
const atMax = computed(() => quantity.value >= max)

function decrease(): void {
  quantity.value = Math.max(min, quantity.value - step)
}

function increase(): void {
  quantity.value = Math.min(max, quantity.value + step)
}

const classes = {
  button: 'inline-flex w-9 shrink-0 items-center justify-center bg-argent-50 text-sable-950 transition-colors hover:bg-argent-100 disabled:cursor-not-allowed disabled:text-argent-300 disabled:hover:bg-argent-50',
  frame: {
    valid: 'border-argent-250',
    invalid: 'border-ambre-300',
  },
  value: {
    valid: 'text-sable-950',
    invalid: 'text-ambre-700',
  },
}

const state = computed(() => (invalid ? 'invalid' : 'valid'))
</script>

<template>
  <div
    class="flex h-10 overflow-hidden rounded-field border"
    :class="classes.frame[state]"
  >
    <button
      type="button"
      :class="classes.button"
      :aria-label="`Retirer : ${label}`"
      :disabled="atMin"
      @click="decrease"
    >
      <Minus :size="14" />
    </button>
    <output
      class="flex min-w-0 flex-1 items-center justify-center px-2 font-mono text-sm font-semibold whitespace-nowrap"
      :class="classes.value[state]"
    >
      <slot :quantity>{{ quantity }}</slot>
    </output>
    <button
      type="button"
      :class="classes.button"
      :aria-label="`Ajouter : ${label}`"
      :disabled="atMax"
      @click="increase"
    >
      <Plus :size="14" />
    </button>
  </div>
</template>
