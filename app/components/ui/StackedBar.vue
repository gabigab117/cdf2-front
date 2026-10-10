<script setup lang="ts">
/** A share of the total, such as the units out on loan. */
interface StackedBarSegment {
  value: number
  label: string
  /**
   * Azur: available. Black: out. Amber: under repair. The lighter tones and
   * the grey tell more shares apart, such as the types of place of a meal.
   */
  tone: 'azur' | 'sable' | 'ambre' | 'azurLight' | 'ambreLight' | 'argent'
}

const { segments, total, label, size = 'md', legend = false } = defineProps<{
  segments: readonly StackedBarSegment[]
  total: number
  /** What the bar breaks down, for screen readers. */
  label: string
  /** 10 or 6 px high. */
  size?: 'sm' | 'md'
  /** Each share with its colour and its value, under the bar. */
  legend?: boolean
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
    azurLight: 'bg-azur-300',
    ambreLight: 'bg-ambre-300',
    argent: 'bg-argent-400',
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
  <div class="flex flex-col gap-3">
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
    <!-- The bar says it already to screen readers: the legend is for the eye. -->
    <ul
      v-if="legend"
      aria-hidden="true"
      class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-sable-600"
    >
      <li
        v-for="segment in segments"
        :key="segment.label"
        class="inline-flex items-center gap-2"
      >
        <span
          class="size-2.5 rounded-full"
          :class="classes.tone[segment.tone]"
        />
        {{ segment.label }}
        <span class="font-mono font-semibold text-sable-950">{{ segment.value }}</span>
      </li>
    </ul>
  </div>
</template>
