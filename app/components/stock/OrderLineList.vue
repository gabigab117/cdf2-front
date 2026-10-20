<script setup lang="ts">
import type { components } from '~/types/api'

type OrderLineOut = components['schemas']['OrderLineOut']

// The lines of an order, each its item and what comes of it: « +12 kg ».
const { lines } = defineProps<{ lines: readonly OrderLineOut[] }>()

const { signedQuantity } = useQuantityFormat()

const rows = computed(() =>
  lines.map(({ item, quantity }) => ({ id: item.id, name: item.name, quantity: signedQuantity(quantity, item.unit) })),
)
</script>

<template>
  <ul class="flex flex-col gap-1.5">
    <li
      v-for="row in rows"
      :key="row.id"
      class="flex justify-between gap-2.5"
    >
      <span>{{ row.name }}</span>
      <span class="font-mono font-semibold whitespace-nowrap">{{ row.quantity }}</span>
    </li>
  </ul>
</template>
