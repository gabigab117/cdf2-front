<script setup lang="ts">
import { CalendarDays, Plus } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'
import type { EquipmentFields, InventoryQuery } from '~/utils/equipment'

definePageMeta({ path: '/bureau/materiel', fullWidth: true, topBarAction: true })

useHead({ title: 'Matériel' })

const route = useRoute()
const query = computed(() => parseInventoryQuery(route.query))

const { data: inventory, status, error, refresh } = useInventory()
const { addEquipment } = useEquipmentWrites()

const loading = computed(() => status.value === 'pending')
const items = computed(() => inventory.value?.items ?? [])
const selected = computed(() => {
  const id = query.value.equipment
  return typeof id === 'number' ? inventory.value?.items.find(item => item.equipment.id === id) ?? null : null
})
const adding = computed(() => query.value.equipment === 'new')
const panelShown = computed(() => adding.value || selected.value !== null)

const figures = computed(() => (inventory.value ? inventoryFigures(inventory.value.totals) : ''))

const LEGEND = [
  { label: 'Disponible aujourd’hui', tone: 'azur' },
  { label: 'Sorti (prêt en cours)', tone: 'sable' },
  { label: 'En réparation', tone: 'ambre' },
] as const

function location(changes: Partial<InventoryQuery>) {
  return { query: inventoryQuery({ ...query.value, ...changes }) }
}

function equipmentLink(id: number) {
  return location({ equipment: id })
}

async function close(): Promise<void> {
  await navigateTo(location({ equipment: null }))
}

async function add(fields: EquipmentFields): Promise<FormErrors | null> {
  const result = await addEquipment(equipmentPayload(fields))
  if (result.errors) return result.errors
  await refresh()
  await navigateTo(location({ equipment: result.data.id }))
  return null
}

async function deleted(): Promise<void> {
  await close()
  await refresh()
}
</script>

<template>
  <div class="flex min-w-0 flex-1">
    <Teleport
      defer
      to="#board-top-bar-action"
    >
      <BoardTopBarButton
        :icon="Plus"
        label="Nouveau prêt"
        :to="NEW_LOAN_PATH"
      />
    </Teleport>
    <div
      class="flex min-w-0 flex-1 flex-col gap-5.5 px-4 pt-6 pb-10 md:px-8 md:pt-8 md:pb-12"
      :class="{ 'max-md:hidden': panelShown }"
    >
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <BoardPageTitle>Matériel</BoardPageTitle>
          <p class="text-lead text-argent-600">
            {{ figures }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton
            variant="secondary"
            :to="`${LOANS_PATH}#planning`"
          >
            <CalendarDays :size="17" />
            Planning des prêts
          </UiButton>
          <UiButton
            variant="secondary"
            :to="location({ equipment: 'new' })"
          >
            <Plus :size="17" />
            Ajouter du matériel
          </UiButton>
        </div>
      </div>
      <UiLegend :items="LEGEND" />
      <BoardLoadError
        v-if="error"
        :message="error.message"
        @retry="refresh()"
      />
      <UiCard
        v-else
        flush
        :aria-busy="loading || undefined"
      >
        <EquipmentTable
          v-if="items.length > 0"
          :items
          :selected="selected?.equipment.id ?? null"
          :location="equipmentLink"
        />
        <UiEmptyState v-else-if="!loading">
          Aucun matériel dans l’inventaire pour l’instant.
        </UiEmptyState>
      </UiCard>
    </div>
    <UiSidePanel
      v-if="adding"
      title="Ajouter du matériel"
      closable
      class="md:sticky md:top-17 md:h-below-top-bar md:overflow-y-auto"
      @close="close"
    >
      <EquipmentForm
        :save="add"
        @cancel="close"
      />
    </UiSidePanel>
    <EquipmentPanel
      v-else-if="selected"
      :key="selected.equipment.id"
      :item="selected"
      class="md:sticky md:top-17 md:h-below-top-bar md:overflow-y-auto"
      @changed="refresh()"
      @deleted="deleted"
      @close="close"
    />
  </div>
</template>
