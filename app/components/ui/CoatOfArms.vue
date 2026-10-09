<script setup lang="ts">
const { surface = 'light' } = defineProps<{
  /** What the coat of arms stands on: the board's sidebar is dark. */
  surface?: 'light' | 'dark'
}>()

const classes = {
  light: { shield: 'fill-white stroke-sable-950 stroke-2', chevron: 'fill-azur-600', dots: 'fill-sable-950' },
  dark: { shield: 'fill-white', chevron: 'fill-azur-500', dots: 'fill-sable-900' },
}

const colors = computed(() => classes[surface])
</script>

<template>
  <svg
    viewBox="0 0 32 36"
    aria-hidden="true"
  >
    <path
      d="M2 2h28v15c0 8.5-6 14-14 17C8 31 2 25.5 2 17z"
      :class="colors.shield"
    />
    <path
      d="M7 22L16 13l9 9v4.5l-9-9-9 9z"
      :class="colors.chevron"
    />
    <g :class="colors.dots">
      <circle
        cx="9.5"
        cy="8.5"
        r="1.7"
      />
      <circle
        cx="22.5"
        cy="8.5"
        r="1.7"
      />
      <circle
        cx="16"
        cy="25"
        r="1.7"
      />
    </g>
  </svg>
</template>
