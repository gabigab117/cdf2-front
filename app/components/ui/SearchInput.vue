<script setup lang="ts">
import { Search } from '@lucide/vue'

// The placeholder and other attributes fall through to the input, not to its frame.
defineOptions({ inheritAttrs: false })

const value = defineModel<string>({ default: '' })

const { label } = defineProps<{
  /** What is searched, read by screen readers: the placeholder gives examples. */
  label: string
}>()
</script>

<template>
  <label class="flex h-12 items-center gap-2.5 rounded-search border border-argent-200 bg-white px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-azur-600">
    <Search
      :size="18"
      aria-hidden="true"
      class="shrink-0 text-argent-600"
    />
    <span class="sr-only">{{ label }}</span>
    <input
      v-model="value"
      v-bind="$attrs"
      type="search"
      class="min-w-0 flex-1 bg-transparent text-body text-sable-950 outline-none placeholder:text-argent-500"
    >
  </label>
</template>
