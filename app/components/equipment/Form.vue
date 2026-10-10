<script setup lang="ts">
import { CircleAlert, Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { EquipmentFields } from '~/utils/equipment'

type EquipmentCategory = components['schemas']['EquipmentCategory']
type EquipmentOut = components['schemas']['EquipmentOut']

// The form of an equipment: a new one, or one to change, such as pieces put
// back in service. Only an equipment already recorded can be deleted.
const { equipment = null, category = null, save, remove } = defineProps<{
  /** The equipment to change, or none for a new one. */
  equipment?: EquipmentOut | null
  /** The category a new equipment starts in: the chip chosen. */
  category?: EquipmentCategory | null
  /** Sends the equipment: the errors to show, or null once it is saved. */
  save: (fields: EquipmentFields) => Promise<FormErrors | null>
  /** Deletes the equipment: null once done, or the message to show. */
  remove?: () => Promise<string | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [], deleted: [] }>()

const fields = ref<EquipmentFields>(equipment ? equipmentFields(equipment) : newEquipmentFields(category))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const SHOWN: ReadonlySet<string> = new Set([
  'name',
  'category',
  'storage_location',
  'total_quantity',
  'repair_quantity',
  'unit_value',
  'repair_note',
])

const form = useTemplateRef<HTMLFormElement>('form')
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending: deleting, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const question = computed(() => `Supprimer « ${equipment?.name} » de l’inventaire ?`)

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(fields.value)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, SHOWN, equipmentFieldLabel)
    await nextTick()
    form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
    return
  }
  errors.value = null
  emit('saved')
}

async function deleteEquipment(): Promise<void> {
  if (remove && await confirm(remove)) emit('deleted')
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-4"
    @submit.prevent="submit"
  >
    <UiCallout
      v-if="errors?.form.length"
      tone="ambre"
      role="alert"
      tabindex="-1"
      :icon="CircleAlert"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiCallout>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Nom"
      :errors="fieldErrors('name')"
    >
      <UiInput
        :id
        v-model="fields.name"
        required
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Catégorie"
      :errors="fieldErrors('category')"
    >
      <UiSelect
        :id
        v-model="fields.category"
        :options="EQUIPMENT_CATEGORY_OPTIONS"
        placeholder="Choisir une catégorie"
        required
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Rangement"
      optional
      :errors="fieldErrors('storage_location')"
    >
      <UiInput
        :id
        v-model="fields.storageLocation"
        placeholder="Local du comité · rack A"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div class="grid grid-cols-2 gap-3">
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Quantité totale"
        :errors="fieldErrors('total_quantity')"
      >
        <UiInput
          :id
          v-model="fields.total"
          type="number"
          min="0"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="En réparation"
        :errors="fieldErrors('repair_quantity')"
      >
        <UiInput
          :id
          v-model="fields.repair"
          type="number"
          min="0"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
    </div>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Valeur de remplacement"
      help="Le prix d’une pièce, en euros."
      optional
      :errors="fieldErrors('unit_value')"
    >
      <UiInput
        :id
        v-model="fields.unitValue"
        inputmode="decimal"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="Note de réparation"
      optional
      :errors="fieldErrors('repair_note')"
    >
      <UiTextarea
        :id
        v-model="fields.repairNote"
        rows="2"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div class="flex flex-wrap items-center gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        Enregistrer
      </UiButton>
      <UiButton
        variant="secondary"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
      <UiButton
        v-if="remove"
        ref="trigger"
        variant="link"
        class="ml-auto"
        @click="ask"
      >
        <Trash2 :size="16" />
        Supprimer
      </UiButton>
    </div>
    <UiConfirmation
      v-if="confirming"
      :question
      :pending="deleting"
      :failure
      @confirm="deleteEquipment"
      @cancel="dismiss"
    />
  </form>
</template>
