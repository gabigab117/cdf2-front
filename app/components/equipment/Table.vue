<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type EquipmentAvailabilityOut = components['schemas']['EquipmentAvailabilityOut']

// The rows of the inventory: each leads to its panel, the one shown selected.
const { items, selected = null, location } = defineProps<{
  items: readonly EquipmentAvailabilityOut[]
  /** The equipment whose panel is open. */
  selected?: number | null
  /** The address of an equipment's panel, the list's own query kept. */
  location: (id: number) => RouteLocationRaw
}>()

const rows = computed(() =>
  items.map(({ equipment, taken, free }) => ({
    id: equipment.id,
    name: equipment.name,
    place: equipment.storage_location,
    total: equipment.total_quantity,
    // A dash, faded, for none: the counts that matter stand out.
    taken: taken || '—',
    takenClass: taken ? 'text-sable-950' : 'text-argent-400',
    repair: equipment.repair_quantity || '—',
    repairClass: equipment.repair_quantity ? 'text-ambre-700' : 'text-argent-400',
    free,
    segments: [
      { value: free, label: free > 1 ? 'disponibles' : 'disponible', tone: 'azur' as const },
      { value: taken, label: taken > 1 ? 'sortis' : 'sorti', tone: 'sable' as const },
      { value: equipment.repair_quantity, label: 'en réparation', tone: 'ambre' as const },
    ],
  })),
)

const grid = 'grid-cols-equipment-narrow md:grid-cols-equipment'
</script>

<template>
  <div>
    <div
      class="grid items-center gap-3.5 border-b border-argent-100 bg-argent-25 px-5 py-2.5 text-caption font-semibold tracking-table text-argent-600 uppercase"
      :class="grid"
      aria-hidden="true"
    >
      <span>Matériel</span>
      <span class="text-right max-md:hidden">Total</span>
      <span class="text-right max-md:hidden">Sorti</span>
      <span class="text-right max-md:hidden">Réparation</span>
      <span class="text-right">Disponible</span>
      <span class="max-md:hidden">Répartition</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="row in rows"
        :key="row.id"
      >
        <UiSelectableRow
          :selected="row.id === selected"
          :to="location(row.id)"
        >
          <span
            class="grid items-center gap-3.5 px-5 py-3"
            :class="grid"
          >
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-ui font-semibold text-sable-950">{{ row.name }}</span>
              <span class="truncate text-caption text-argent-600">{{ row.place }}</span>
            </span>
            <span class="text-right font-mono text-sm max-md:hidden">{{ row.total }}</span>
            <span
              class="text-right font-mono text-sm max-md:hidden"
              :class="row.takenClass"
            >{{ row.taken }}</span>
            <span
              class="text-right font-mono text-sm max-md:hidden"
              :class="row.repairClass"
            >{{ row.repair }}</span>
            <span class="text-right font-mono text-sm font-semibold text-sable-950">
              {{ row.free }}<span class="font-sans text-caption font-normal text-argent-600 md:hidden"> sur {{ row.total }}</span>
            </span>
            <UiStackedBar
              class="max-md:hidden"
              :segments="row.segments"
              :total="row.total"
              :label="row.name"
            />
          </span>
        </UiSelectableRow>
      </li>
    </ul>
  </div>
</template>
