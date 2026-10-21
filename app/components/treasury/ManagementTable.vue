<script setup lang="ts">
import type { components } from '~/types/api'

type ManagementOut = components['schemas']['ManagementOut']
type ManagementRowOut = components['schemas']['ManagementRowOut']

// « Résultat de gestion par événement » (D16): what each event brought in and
// cost, the share of its expenses gone into stock and the goods it consumed,
// then its management result and its bar margin, as the API works them out;
// the general running last, its consumption with the losses of the
// stocktakes. Below 820 px, a row keeps its name and its result, its figures
// under them. The header is drawn only: each figure names its column for a
// screen reader.
const { management } = defineProps<{ management: ManagementOut }>()

const { amount, signed, rate } = useMoneyFormat()

const classes = {
  grid: 'grid-cols-management-narrow md:grid-cols-management',
  gain: 'text-azur-700',
  loss: 'text-ambre-700',
  unlinked: 'text-ambre-700',
  losses: 'text-argent-600',
}

function row(entry: ManagementRowOut, name: string, losses: string | null) {
  const income = amount(entry.income)
  const expense = amount(entry.expense)
  const stocked = amount(entry.stocked_purchases)
  const consumed = amount(entry.consumption_cost)
  const margin = amount(entry.bar_margin)
  const marginRate = rate(entry.margin_rate)
  return {
    key: entry.event?.id ?? 'general',
    name,
    cells: [
      { label: 'Recettes', value: income },
      { label: 'Dépenses', value: expense },
      { label: 'Mis en stock', value: stocked },
      { label: 'Consommé', value: consumed },
    ],
    result: signed(entry.management_result),
    resultClass: Number(entry.management_result) >= 0 ? classes.gain : classes.loss,
    margin,
    marginRate,
    notes: [
      ...(Number(entry.unlinked_purchases) > 0
        ? [{ text: `Achats sans dépense : ${amount(entry.unlinked_purchases)}`, class: classes.unlinked }]
        : []),
      ...(losses ? [{ text: `Dont pertes : ${losses}`, class: classes.losses }] : []),
    ],
    // Under its name below 820 px, where these columns are hidden.
    details: [
      `Recettes ${income}`,
      `dépenses ${expense}`,
      `mis en stock ${stocked}`,
      `consommé ${consumed}`,
      `marge buvette ${entry.margin_rate === null ? margin : `${margin} (${marginRate})`}`,
    ].join(' · '),
  }
}

const rows = computed(() => {
  const losses = management.stock.losses.total
  return [
    ...management.events.map(entry => row(entry, entry.event?.title ?? '', null)),
    row(management.general, GENERAL_LABEL, Number(losses) !== 0 ? amount(losses) : null),
  ]
})
const total = computed(() => signed(management.totals.management_result))
</script>

<template>
  <div class="flex flex-col">
    <div
      aria-hidden="true"
      class="grid items-center gap-3 border-b border-argent-100 bg-argent-25 px-5.5 py-2.5 text-caption font-semibold tracking-table text-argent-600 uppercase"
      :class="classes.grid"
    >
      <span>Événement</span>
      <span class="text-right max-md:hidden">Recettes</span>
      <span class="text-right max-md:hidden">Dépenses</span>
      <span class="text-right max-md:hidden">Mis en stock</span>
      <span class="text-right max-md:hidden">Consommé</span>
      <span class="text-right">Résultat de gestion</span>
      <span class="text-right max-md:hidden">Marge buvette</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="entry in rows"
        :key="entry.key"
        class="grid items-start gap-3 px-5.5 py-3 text-sm"
        :class="classes.grid"
      >
        <span class="flex min-w-0 flex-col gap-0.5 leading-snug">
          <span class="truncate font-medium text-sable-950">{{ entry.name }}</span>
          <span
            v-for="note in entry.notes"
            :key="note.text"
            class="text-caption"
            :class="note.class"
          >{{ note.text }}</span>
          <span class="text-caption text-argent-600 md:hidden">{{ entry.details }}</span>
        </span>
        <span
          v-for="cell in entry.cells"
          :key="cell.label"
          class="text-right font-mono max-md:hidden"
        ><span class="sr-only">{{ cell.label }} :</span> {{ cell.value }}</span>
        <span
          class="text-right font-mono font-semibold"
          :class="entry.resultClass"
        ><span class="sr-only">Résultat de gestion :</span> {{ entry.result }}</span>
        <span class="flex flex-col text-right max-md:hidden">
          <span class="font-mono"><span class="sr-only">Marge buvette :</span> {{ entry.margin }}</span>
          <span class="text-caption text-argent-600">{{ entry.marginRate }}</span>
        </span>
      </li>
    </ul>
    <p class="flex justify-between gap-3 border-t border-argent-100 px-5.5 py-3.5 text-sm font-semibold">
      <span>Total des résultats de gestion</span>
      <span class="font-mono">{{ total }}</span>
    </p>
  </div>
</template>
