<script setup lang="ts">
definePageMeta({ path: '/bureau/tresorerie/gestion' })

useHead({ title: 'Contrôle de gestion' })

const route = useRoute()
const now = useNow()
const query = computed(() => parseTreasuryQuery(route.query))
const year = computed(() => shownYear(query.value, now.value))

const { data: management, error, refresh } = useManagement(() => year.value)

const { amount, signed } = useMoneyFormat()

const breadcrumb = computed(() => [
  { label: 'Trésorerie', to: ledgerLocation(TREASURY_PATH, { year: query.value.year }) },
  { label: 'Contrôle de gestion' },
])
const current = computed(() => year.value === parisCalendar(now.value).year)
const span = computed(() => yearSpan(year.value, now.value))
const closingLabel = computed(() => (current.value ? 'Valeur aujourd’hui' : 'Valeur au 31 décembre'))

// The figures of the year, as the API works them out (D16).
const kpis = computed(() => {
  const totals = management.value?.totals
  if (!totals) return null
  const closing = amount(totals.closing_value)
  return {
    result: signed(totals.result),
    change: signed(totals.stock_change),
    changeSpan: `De ${amount(totals.opening_value)} à ${closing}`,
    adjusted: signed(totals.adjusted_result),
    value: closing,
    valueDay: current.value ? 'Aujourd’hui' : `Au 31 décembre ${year.value}`,
  }
})
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <div class="flex flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-3.5">
        <BoardPageTitle>Contrôle de gestion</BoardPageTitle>
        <TreasuryYearSelect
          :year
          :years="management?.years ?? []"
          :location="yearLocation"
        />
      </div>
      <p class="text-lead text-argent-600">
        Le résultat de chaque événement, une fois ses marchandises comptées au prix moyen pondéré.
      </p>
    </div>
    <template v-if="management && kpis">
      <div class="grid grid-cols-kpis gap-3.5">
        <UiKpiCard
          label="Résultat de l’exercice"
          :value="kpis.result"
          figure="amount"
        >
          {{ span }}
        </UiKpiCard>
        <UiKpiCard
          label="Variation du stock"
          :value="kpis.change"
          figure="amount"
        >
          {{ kpis.changeSpan }}
        </UiKpiCard>
        <UiKpiCard
          label="Résultat corrigé"
          :value="kpis.adjusted"
          figure="amount"
          tone="dark"
        >
          Résultat plus variation du stock
        </UiKpiCard>
        <UiKpiCard
          label="Valeur du stock"
          :value="kpis.value"
          figure="amount"
        >
          {{ kpis.valueDay }}
        </UiKpiCard>
      </div>
      <UiCard
        title="Résultat de gestion par événement"
        flush
      >
        <TreasuryManagementTable :management />
      </UiCard>
      <div class="grid items-start gap-5 md:grid-cols-2">
        <div class="flex flex-col gap-5">
          <TreasuryManagementStock
            :management
            :closing-label
          />
          <TreasuryStockLosses :losses="management.stock.losses" />
        </div>
        <div class="flex flex-col gap-5">
          <TreasuryReconciliation :reconciliation="management.reconciliation" />
          <TreasuryManagementControls :controls="management.controls" />
        </div>
      </div>
    </template>
    <BoardLoadError
      v-else-if="error"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
