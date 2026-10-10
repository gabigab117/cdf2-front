<script setup lang="ts">
import { Wrench } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { EquipmentFields } from '~/utils/equipment'

type EquipmentAvailabilityOut = components['schemas']['EquipmentAvailabilityOut']

// The panel of an equipment beside the inventory: what it holds today, where
// it is kept, its repairs, and the loans of the weeks to come.
const { item } = defineProps<{
  /** The equipment, as today's inventory gives it. */
  item: EquipmentAvailabilityOut
}>()

const emit = defineEmits<{
  /** The equipment changed: the inventory is fetched again. */
  changed: []
  deleted: []
  close: []
}>()

const { changeEquipment, deleteEquipment } = useEquipmentWrites()
const { amount } = useMoneyFormat()

const editing = ref(false)

const equipment = computed(() => item.equipment)

// Today's count of its pieces: what is free stands out in azur.
const tiles = computed(() => [
  { label: 'Total', value: equipment.value.total_quantity, classes: 'bg-argent-50', labelClass: 'text-argent-600', valueClass: 'text-sable-950' },
  { label: 'Disponible', value: item.free, classes: 'bg-azur-50', labelClass: 'text-argent-650', valueClass: 'text-azur-700' },
  { label: 'Réparation', value: equipment.value.repair_quantity, classes: 'bg-argent-50', labelClass: 'text-argent-600', valueClass: 'text-sable-950' },
])

const value = computed(() => (equipment.value.unit_value === null ? '—' : `${amount(equipment.value.unit_value)} l’unité`))

// The note of the board, or what is known without it.
const repairNote = computed(() => {
  const pieces = equipment.value.repair_quantity
  return equipment.value.repair_note || `${pieces} ${pieces > 1 ? 'pièces' : 'pièce'} en réparation.`
})

async function save(fields: EquipmentFields): Promise<FormErrors | null> {
  const result = await changeEquipment(equipment.value.id, equipmentPayload(fields))
  return result.errors ?? null
}

function saved(): void {
  editing.value = false
  emit('changed')
}

function remove(): Promise<string | null> {
  return deleteEquipment(equipment.value.id)
}
</script>

<template>
  <UiSidePanel
    :title="equipment.name"
    :subtitle="EQUIPMENT_CATEGORIES[equipment.category].label"
    closable
    @close="emit('close')"
  >
    <EquipmentForm
      v-if="editing"
      :equipment
      :save
      :remove
      @saved="saved"
      @cancel="editing = false"
      @deleted="emit('deleted')"
    />
    <template v-else>
      <dl class="grid grid-cols-3 gap-2">
        <div
          v-for="tile in tiles"
          :key="tile.label"
          class="flex flex-col gap-0.5 rounded-field px-3 py-2.5"
          :class="tile.classes"
        >
          <dt
            class="text-xs"
            :class="tile.labelClass"
          >
            {{ tile.label }}
          </dt>
          <dd
            class="font-mono text-xl font-semibold"
            :class="tile.valueClass"
          >
            {{ tile.value }}
          </dd>
        </div>
      </dl>
      <dl class="flex flex-col text-sm">
        <div class="flex justify-between gap-3 border-b border-argent-100 py-2">
          <dt class="text-argent-600">
            Rangement
          </dt>
          <dd class="text-right font-medium">
            {{ equipment.storage_location || '—' }}
          </dd>
        </div>
        <div class="flex justify-between gap-3 py-2">
          <dt class="text-argent-600">
            Valeur de remplacement
          </dt>
          <dd class="font-mono font-medium">
            {{ value }}
          </dd>
        </div>
      </dl>
      <UiCallout
        v-if="equipment.repair_quantity > 0"
        tone="ambre"
        :icon="Wrench"
      >
        {{ repairNote }}
      </UiCallout>
      <EquipmentOccupancy :id="equipment.id" />
    </template>
    <template
      v-if="!editing"
      #footer
    >
      <div class="flex gap-2">
        <UiButton
          variant="accent"
          size="lg"
          class="flex-1"
          :to="{ path: NEW_LOAN_PATH, query: { materiel: String(equipment.id) } }"
        >
          Prêter ce matériel
        </UiButton>
        <UiButton
          variant="secondary"
          size="lg"
          @click="editing = true"
        >
          Modifier
        </UiButton>
      </div>
    </template>
  </UiSidePanel>
</template>
