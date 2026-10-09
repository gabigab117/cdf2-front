<script setup lang="ts">
// Ids and descriptions fall through to the checkbox, which screen readers
// announce as a switch.
defineOptions({ inheritAttrs: false })

const checked = defineModel<boolean>({ default: false })

const { label } = defineProps<{
  /** What the switch turns on, shown next to it. */
  label: string
}>()
</script>

<template>
  <label class="group inline-flex cursor-pointer items-center gap-2.5">
    <input
      v-model="checked"
      v-bind="$attrs"
      type="checkbox"
      role="switch"
      class="sr-only"
    >
    <span
      aria-hidden="true"
      class="relative h-6.5 w-10.5 shrink-0 rounded-full bg-argent-350 transition-colors group-has-checked:bg-azur-600 group-has-focus-visible:outline-2 group-has-focus-visible:outline-offset-2 group-has-focus-visible:outline-azur-600"
    >
      <span class="absolute top-0.75 left-0.75 size-5 rounded-full bg-white shadow-knob transition-transform group-has-checked:translate-x-4" />
    </span>
    <span class="text-ui font-medium">{{ label }}</span>
  </label>
</template>
