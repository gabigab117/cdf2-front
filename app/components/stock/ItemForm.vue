<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { ItemFields } from '~/utils/stock'

type StockItemOut = components['schemas']['StockItemOut']

// The form of an item: a new one, or one to correct. Only an item already
// recorded can be deleted, and the API refuses it once it has moved.
const { item = null, save, remove } = defineProps<{
  /** The item to correct, or none for a new one. */
  item?: StockItemOut | null
  /** Sends the item: the errors to show, or null once it is saved. */
  save: (fields: ItemFields) => Promise<FormErrors | null>
  /** Deletes the item: null once done, or the message to show. */
  remove?: () => Promise<string | null>
}>()

const emit = defineEmits<{ deleted: [] }>()

const now = useNow()
const { calendarMonth } = useDateFormat()

const fields = ref<ItemFields>(item ? itemFields(item) : newItemFields())
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const SHOWN: ReadonlySet<string> = new Set(['name', 'category', 'unit', 'threshold', 'step', 'best_before', 'initial_cost'])

const categories = STOCK_CATEGORY_VALUES.map(category => ({
  value: category,
  label: STOCK_CATEGORIES[category].label,
}))
const months = computed(() => [
  { value: '', label: 'Aucune' },
  ...bestBeforeMonths(now.value, item?.best_before).map(month => ({ value: month, label: calendarMonth(month) })),
])

const form = useTemplateRef<HTMLFormElement>('form')
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending: deleting, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const question = computed(() => `Supprimer « ${item?.name} » du stock ?`)

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(fields.value)
  pending.value = false
  if (!result) return
  errors.value = placeErrors(result, SHOWN)
  await focusErrors(form)
}

async function deleteItem(): Promise<void> {
  if (remove && await confirm(remove)) emit('deleted')
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-4"
    @submit.prevent="submit"
  >
    <UiAlert
      v-if="errors?.form.length"
      tabindex="-1"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiAlert>
    <UiField
      v-slot="{ control }"
      label="Nom"
      :errors="errors?.fields.name"
    >
      <UiInput
        v-bind="control"
        v-model="fields.name"
        required
        placeholder="Ex. Jus de fruits 1 L"
      />
    </UiField>
    <div class="grid gap-3 md:grid-cols-2">
      <UiField
        v-slot="{ control }"
        label="Catégorie"
        :errors="errors?.fields.category"
      >
        <UiSelect
          v-bind="control"
          v-model="fields.category"
          :options="categories"
          placeholder="Choisir une catégorie"
          required
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Unité"
        optional
        help="Écrite après la quantité : kg, fûts…"
        :errors="errors?.fields.unit"
      >
        <UiInput
          v-bind="control"
          v-model="fields.unit"
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Seuil"
        help="En dessous, l’article est signalé bas."
        :errors="errors?.fields.threshold"
      >
        <UiInput
          v-bind="control"
          v-model="fields.threshold"
          inputmode="decimal"
          required
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Pas"
        help="Ce que retirent ou ajoutent les boutons − et +."
        :errors="errors?.fields.step"
      >
        <UiInput
          v-bind="control"
          v-model="fields.step"
          inputmode="decimal"
          required
        />
      </UiField>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <UiField
        v-slot="{ control }"
        label="DLUO"
        optional
        :errors="errors?.fields.best_before"
      >
        <UiSelect
          v-bind="control"
          v-model="fields.bestBefore"
          :options="months"
        />
      </UiField>
      <UiField
        v-slot="{ control }"
        label="Prix de départ"
        optional
        help="Prix unitaire, en euros, du stock déjà là avant le premier achat avec prix."
        :errors="errors?.fields.initial_cost"
      >
        <UiInput
          v-bind="control"
          v-model="fields.initialCost"
          inputmode="decimal"
        />
      </UiField>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        Enregistrer
      </UiButton>
      <UiButton
        variant="secondary"
        :to="STOCK_PATH"
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
      @confirm="deleteItem"
      @cancel="dismiss"
    />
  </form>
</template>
