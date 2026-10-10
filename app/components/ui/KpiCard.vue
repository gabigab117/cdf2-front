<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { NuxtLink } from '#components'

const { label, value, tone = 'light', icon, to } = defineProps<{
  label: string
  value: string
  /** White, azur for what awaits an action, black for the next event. */
  tone?: 'light' | 'azur' | 'dark'
  /** Shown in a box across from the label. */
  icon?: Component
  /** The page the figure sums up: the whole card links to it. */
  to?: RouteLocationRaw
}>()

const classes = {
  card: {
    light: 'border border-argent-200 bg-white text-sable-950',
    azur: 'bg-azur-600 text-white',
    dark: 'bg-sable-950 text-white',
  },
  muted: {
    light: 'text-argent-600',
    azur: 'text-azur-150',
    dark: 'text-argent-400',
  },
  iconBox: {
    light: 'bg-argent-150',
    azur: 'bg-white/14',
    dark: 'bg-sable-700',
  },
}

const root = computed(() => (to ? NuxtLink : 'div'))
</script>

<template>
  <component
    :is="root"
    :to
    class="flex flex-col gap-3.5 rounded-card p-5.5"
    :class="classes.card[tone]"
  >
    <span class="flex items-center justify-between gap-3">
      <span
        class="text-sm font-medium"
        :class="classes.muted[tone]"
      >{{ label }}</span>
      <span
        v-if="icon"
        class="inline-flex size-9 items-center justify-center rounded-icon"
        :class="classes.iconBox[tone]"
      >
        <component
          :is="icon"
          :size="18"
        />
      </span>
      <slot name="aside" />
    </span>
    <span class="font-display text-kpi font-bold">{{ value }}</span>
    <!-- A block: a progress bar may stand in it. -->
    <div
      v-if="$slots.default"
      class="text-note"
      :class="classes.muted[tone]"
    >
      <slot />
    </div>
  </component>
</template>
