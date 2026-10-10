<script setup lang="ts">
/** A colour of the bars beside it, and what it stands for. */
interface LegendItem {
  label: string
  tone: 'azur' | 'sable' | 'ambre' | 'argent'
  /** A swatch for the colour of a bar; a line for a day drawn across them. */
  shape?: 'swatch' | 'line'
}

const { items } = defineProps<{ items: readonly LegendItem[] }>()

const classes = {
  tone: {
    azur: 'bg-azur-600',
    sable: 'bg-sable-950',
    ambre: 'bg-ambre-500',
    argent: 'bg-argent-300',
  },
  shape: {
    swatch: 'size-2.5 rounded-swatch',
    line: 'h-3 w-0.5',
  },
}

const marks = computed(() =>
  items.map(item => ({ label: item.label, classes: [classes.tone[item.tone], classes.shape[item.shape ?? 'swatch']] })),
)

// The bars say what they hold in words: the legend is for the eye alone.
</script>

<template>
  <ul
    aria-hidden="true"
    class="flex flex-wrap gap-x-4 gap-y-2 text-caption text-sable-600"
  >
    <li
      v-for="mark in marks"
      :key="mark.label"
      class="inline-flex items-center gap-1.5"
    >
      <span :class="mark.classes" />
      {{ mark.label }}
    </li>
  </ul>
</template>
