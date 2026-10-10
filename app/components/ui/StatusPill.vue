<script setup lang="ts">
const { tone = 'neutral', size = 'md', dot = false } = defineProps<{
  /**
   * Azur for what goes ahead, solid azur for what is under way, amber for what
   * needs attention, black for the committee's own use, an outline for a
   * category on the board. The public agenda colours its categories with them,
   * and with steel; the documents, with slate and mist too.
   */
  tone?: 'azur' | 'accent' | 'ambre' | 'neutral' | 'steel' | 'dark' | 'outline' | 'slate' | 'mist'
  /** 22, 26 or 28 px high. */
  size?: 'sm' | 'md' | 'lg'
  /** A dot before the text, as for "Publié sur le site". */
  dot?: boolean
}>()

const classes = {
  base: 'inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
  size: {
    sm: 'h-5.5 px-2 text-overline tracking-normal',
    md: 'h-6.5 px-2.5 text-caption',
    lg: 'h-7 px-3 text-label',
  },
  tone: {
    azur: 'bg-azur-100 text-azur-700',
    accent: 'bg-azur-600 text-white',
    ambre: 'bg-ambre-50 text-ambre-800',
    neutral: 'bg-argent-100 text-sable-600',
    steel: 'bg-argent-175 text-sable-800',
    dark: 'bg-sable-950 text-white',
    outline: 'border border-argent-200 bg-white font-medium text-sable-600',
    slate: 'bg-argent-100 text-sable-800',
    mist: 'bg-argent-75 text-sable-600',
  },
}

const pillClasses = computed(() => [classes.base, classes.size[size], classes.tone[tone]])
</script>

<template>
  <span :class="pillClasses">
    <span
      v-if="dot"
      class="size-1.75 rounded-full bg-azur-600"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
