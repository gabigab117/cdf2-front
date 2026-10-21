<script setup lang="ts">
import type { components } from '~/types/api'

type ReconciliationOut = components['schemas']['ReconciliationOut']

// « Rapprochement » (D16): from the management results to the adjusted result
// of the fiscal year, each line adding to the one before, as the API works
// them out.
const { reconciliation } = defineProps<{ reconciliation: ReconciliationOut }>()

const { signed } = useMoneyFormat()

const rows = computed(() => [
  { label: 'Résultats de gestion', value: signed(reconciliation.management_result) },
  { label: 'Achats sans dépense', value: signed(reconciliation.unlinked_purchases) },
  { label: 'Achats payés par une dépense d’un autre exercice', value: signed(reconciliation.paid_another_year) },
  { label: 'Achats d’un autre exercice payés sur celui-ci', value: signed(reconciliation.recorded_another_year) },
  { label: 'Résultat corrigé', value: signed(reconciliation.adjusted_result) },
])
</script>

<template>
  <UiCard title="Rapprochement">
    <p class="text-note text-argent-600">
      Des résultats de gestion au résultat corrigé de l’exercice.
    </p>
    <UiDetailList :rows />
  </UiCard>
</template>
