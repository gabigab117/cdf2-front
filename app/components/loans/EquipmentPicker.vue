<script setup lang="ts">
import type { components } from '~/types/api'

type EquipmentAvailabilityOut = components['schemas']['EquipmentAvailabilityOut']
type EquipmentCategory = components['schemas']['EquipmentCategory']

// The equipment of a loan: what each offers over the loan's days, what takes
// it, and how many pieces the loan takes. A stepper stops at what is free; a
// quantity beyond, left by a change of days, shows as a conflict.
const quantities = defineModel<Record<number, number>>({ required: true })

const { items, errors = {} } = defineProps<{
  items: readonly EquipmentAvailabilityOut[]
  /** The refusals of the API, by equipment. */
  errors?: Readonly<Record<number, readonly string[]>>
}>()

const { calendarPeriod } = useDateFormat()
const now = useNow()

type Filter = 'all' | 'picked' | EquipmentCategory

const filter = ref<Filter>('all')

const LEGEND = [
  { label: 'Libre sur la période', tone: 'azur' },
  { label: 'Pris par d’autres prêts ou événements', tone: 'sable' },
  { label: 'En réparation', tone: 'ambre' },
] as const

function quantityOf(id: number): number {
  return quantities.value[id] ?? 0
}

const chips = computed(() => [
  { value: 'all' as const, label: 'Tout', count: items.length },
  { value: 'picked' as const, label: 'Ajoutés', count: items.filter(item => quantityOf(item.equipment.id) > 0).length },
  ...EQUIPMENT_CATEGORY_VALUES.map(category => ({
    value: category,
    label: EQUIPMENT_CATEGORIES[category].label,
    count: items.filter(item => item.equipment.category === category).length,
  })),
])

function shown(item: EquipmentAvailabilityOut): boolean {
  if (filter.value === 'all') return true
  if (filter.value === 'picked') return quantityOf(item.equipment.id) > 0
  return item.equipment.category === filter.value
}

const rows = computed(() =>
  items.filter(shown).map(({ equipment, taken, free, conflicts }) => {
    const quantity = quantityOf(equipment.id)
    const over = quantity > free
    const repair = equipment.repair_quantity
    const held = conflicts.map(({ loan, quantity: pieces }) =>
      `${loan.display_name} : ${pieces} (${calendarPeriod(loan.start_date, loan.end_date, now.value)})`,
    )
    const detail = [...held, ...(repair ? [`${repair} en réparation`] : [])]
    return {
      id: equipment.id,
      name: equipment.name,
      detail: detail.length ? detail.join(' · ') : 'Aucun autre prêt sur la période',
      available: `${free} ${free > 1 ? 'libres' : 'libre'} / ${equipment.total_quantity}`,
      availableClass: free === 0 || over ? 'text-ambre-700' : 'text-azur-700',
      total: equipment.total_quantity,
      segments: [
        { value: free, label: free > 1 ? 'libres' : 'libre', tone: 'azur' as const },
        { value: Math.min(taken, equipment.total_quantity - repair), label: 'pris', tone: 'sable' as const },
        { value: repair, label: 'en réparation', tone: 'ambre' as const },
      ],
      quantity,
      free,
      over,
      errors: errors[equipment.id],
      rowClass: over ? 'bg-ambre-25 shadow-over' : quantity > 0 ? 'bg-azur-25 shadow-selected' : '',
    }
  }),
)

function setQuantity(id: number, quantity: number): void {
  quantities.value = withQuantity(quantities.value, id, quantity)
}
</script>

<template>
  <div class="flex flex-col">
    <div
      role="group"
      aria-label="Catégories"
      class="flex flex-wrap gap-1.5 px-5.5 pb-4"
    >
      <UiFilterChip
        v-for="chip in chips"
        :key="chip.value"
        size="sm"
        :pressed="filter === chip.value"
        :count="chip.count"
        @click="filter = chip.value"
      >
        {{ chip.label }}
      </UiFilterChip>
    </div>
    <ul class="divide-y divide-argent-100 border-y border-argent-100">
      <li
        v-for="row in rows"
        :key="row.id"
        class="flex flex-wrap items-center gap-x-4 gap-y-3 px-5.5 py-3.5 md:grid md:grid-cols-loan-line"
        :class="row.rowClass"
      >
        <span class="flex min-w-0 basis-full flex-col gap-0.5 md:basis-auto">
          <span class="text-ui font-semibold text-sable-950">{{ row.name }}</span>
          <span class="text-note text-pretty text-argent-600">{{ row.detail }}</span>
          <span
            v-for="message in row.errors"
            :key="message"
            role="alert"
            class="text-note font-semibold text-ambre-800"
          >{{ message }}</span>
        </span>
        <span class="flex flex-1 flex-col items-end gap-1.5 md:flex-none">
          <span
            class="text-note font-semibold whitespace-nowrap"
            :class="row.availableClass"
          >{{ row.available }}</span>
          <UiStackedBar
            class="w-full"
            size="sm"
            :segments="row.segments"
            :total="row.total"
            :label="row.name"
          />
        </span>
        <UiStepper
          class="w-33"
          :model-value="row.quantity"
          :label="row.name"
          :max="row.free"
          :invalid="row.over || !!row.errors"
          @update:model-value="setQuantity(row.id, $event)"
        />
      </li>
    </ul>
    <UiLegend
      class="px-5.5 py-3.5"
      :items="LEGEND"
    />
  </div>
</template>
