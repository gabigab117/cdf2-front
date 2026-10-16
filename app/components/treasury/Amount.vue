<script setup lang="ts">
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// What a line brings in, in azur, or takes out: « +1 862,50 € », « −286,30 € ».
const { entry } = defineProps<{ entry: Pick<LedgerEntryOut, 'kind' | 'amount'> }>()

const { signed } = useMoneyFormat()

const classes = {
  income: 'text-azur-700',
  expense: 'text-sable-950',
}
</script>

<template>
  <span
    class="font-mono font-semibold"
    :class="classes[entry.kind]"
  >{{ signed(signedAmount(entry)) }}</span>
</template>
