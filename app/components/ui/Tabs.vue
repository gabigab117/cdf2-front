<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'

const selected = defineModel<T>({ required: true })

const { tabs, label } = defineProps<{
  tabs: ReadonlyArray<{
    value: T
    label: string
    /** How many items the section holds: "6", "9/14". */
    count?: string
    icon?: Component
  }>
  /** What the sections belong to, for screen readers. */
  label: string
}>()

const id = useId()
const panelId = `${id}-panel`

function tabId(value: T): string {
  return `${id}-tab-${value}`
}

// The arrow keys move to the previous or next tab, Home and End to the first
// or last: the tab reached is selected at once.
function moveFrom(index: number, event: KeyboardEvent): void {
  const last = tabs.length - 1
  const targets: Record<string, number> = {
    ArrowLeft: index === 0 ? last : index - 1,
    ArrowRight: index === last ? 0 : index + 1,
    Home: 0,
    End: last,
  }
  const tab = tabs[targets[event.key] ?? -1]
  if (!tab) return
  event.preventDefault()
  selected.value = tab.value
  document.getElementById(tabId(tab.value))?.focus()
}

// On a phone the bar scrolls: the tab selected stays in sight, even one an
// address chose (« Voir les 5 documents » opens the last but one).
function reveal(): void {
  document.getElementById(tabId(selected.value))?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

onMounted(reveal)
watch(selected, reveal, { flush: 'post' })

const classes = {
  base: 'inline-flex h-11.5 shrink-0 items-center gap-2 border-b-2 px-3.5 text-ui whitespace-nowrap transition-colors',
  selected: 'border-sable-950 font-semibold text-sable-950',
  idle: 'border-transparent font-medium text-argent-600 hover:text-sable-950',
}

function tabClasses(value: T): string[] {
  return [classes.base, value === selected.value ? classes.selected : classes.idle]
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div
      role="tablist"
      :aria-label="label"
      class="flex gap-1 overflow-x-auto shadow-tabs"
    >
      <button
        v-for="(tab, index) in tabs"
        :id="tabId(tab.value)"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="tab.value === selected"
        :aria-controls="panelId"
        :tabindex="tab.value === selected ? 0 : -1"
        :class="tabClasses(tab.value)"
        @click="selected = tab.value"
        @keydown="moveFrom(index, $event)"
      >
        <component
          :is="tab.icon"
          v-if="tab.icon"
          :size="15"
        />
        {{ tab.label }}
        <span
          v-if="tab.count"
          class="font-mono text-xs text-argent-600"
        >{{ tab.count }}</span>
      </button>
    </div>
    <div
      :id="panelId"
      role="tabpanel"
      :aria-labelledby="tabId(selected)"
      tabindex="0"
    >
      <slot :selected />
    </div>
  </div>
</template>
