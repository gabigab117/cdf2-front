<script setup lang="ts">
/** A share of the total, such as the units out on loan. */
interface StackedBarSegment {
  value: number
  label: string
  /** Azur: available. Black: out. Amber: under repair. */
  tone: 'azur' | 'sable' | 'ambre'
}

const { segments, total, label, size = 'md' } = defineProps<{
  segments: readonly StackedBarSegment[]
  total: number
  /** What the bar breaks down, for screen readers. */
  label: string
  /** 10 or 6 px high. */
  size?: 'sm' | 'md'
}>()

const classes = {
  size: {
    sm: 'h-1.5',
    md: 'h-2.5',
  },
  tone: {
    azur: 'bg-azur-600',
    sable: 'bg-sable-950',
    ambre: 'bg-ambre-500',
  },
}

const parts = computed(() =>
  segments
    .filter(segment => segment.value > 0)
    .map(segment => ({ ...segment, width: `${total > 0 ? (segment.value / total) * 100 : 0}%` })),
)

// The bar reads as a sentence: "Barnums : 9 disponibles, 3 sortis, sur 12".
const description = computed(() =>
  `${label} : ${segments.map(segment => `${segment.value} ${segment.label}`).join(', ')}, sur ${total}`,
)
</script>

<template>
  <div
    role="img"
    :aria-label="description"
    class="flex gap-0.5 overflow-hidden rounded-full bg-argent-100"
    :class="classes.size[size]"
  >
    <span
      v-for="part in parts"
      :key="part.label"
      class="h-full"
      :class="classes.tone[part.tone]"
      :style="{ width: part.width }"
    />
  </div>
</template>
