<script setup lang="ts">
import type { Component } from 'vue'

const { tone = 'azur', title, icon } = defineProps<{
  /** Azur to inform or suggest, amber to warn. */
  tone?: 'azur' | 'ambre'
  title?: string
  icon?: Component
}>()

const classes = {
  box: {
    azur: 'border border-azur-200 bg-azur-50 text-sable-800',
    ambre: 'bg-ambre-50 text-ambre-900',
  },
  title: {
    azur: 'text-azur-900',
    ambre: 'text-ambre-950',
  },
  icon: {
    azur: 'text-azur-600',
    ambre: 'text-ambre-700',
  },
}
</script>

<template>
  <div
    class="flex gap-3 rounded-banner px-4.5 py-3.5 text-sm"
    :class="classes.box[tone]"
  >
    <component
      :is="icon"
      v-if="icon"
      :size="18"
      class="mt-px shrink-0"
      :class="classes.icon[tone]"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p
        v-if="title"
        class="font-semibold"
        :class="classes.title[tone]"
      >
        {{ title }}
      </p>
      <slot />
      <div
        v-if="$slots.actions"
        class="mt-2 flex flex-wrap gap-2"
      >
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
