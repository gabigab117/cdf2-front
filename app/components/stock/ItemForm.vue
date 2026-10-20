<script setup lang="ts">
import { CircleAlert, Trash2 } from '@lucide/vue'
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

const SHOWN: ReadonlySet<string> = new Set(Object.keys(ITEM_FIELD_LABELS))

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

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(fields.value)
  pending.value = false
  if (!result) return
  errors.value = placeErrors(result, SHOWN, itemFieldLabel)
  await nextTick()
  form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
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
        placeholder="Ex. Jus de fruits 1 L"
        :aria-describedby="describedby"
        :invalid
      />
    </UiField>
    <div class="grid gap-3 md:grid-cols-2">
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Catégorie"
        :errors="fieldErrors('category')"
      >
        <UiSelect
          :id
          v-model="fields.category"
          :options="categories"
          placeholder="Choisir une catégorie"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Unité"
        optional
        help="Écrite après la quantité : kg, fûts…"
        :errors="fieldErrors('unit')"
      >
        <UiInput
          :id
          v-model="fields.unit"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Seuil"
        help="En dessous, l’article est signalé bas."
        :errors="fieldErrors('threshold')"
      >
        <UiInput
          :id
          v-model="fields.threshold"
          inputmode="decimal"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Pas"
        help="Ce que retirent ou ajoutent les boutons − et +."
        :errors="fieldErrors('step')"
      >
        <UiInput
          :id
          v-model="fields.step"
          inputmode="decimal"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
    </div>
    <UiField
      v-slot="{ id, describedby, invalid }"
      label="DLUO"
      optional
      :errors="fieldErrors('best_before')"
    >
      <UiSelect
        :id
        v-model="fields.bestBefore"
        :options="months"
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
