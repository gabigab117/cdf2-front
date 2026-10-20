<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'

definePageMeta({ path: '/bureau/stock/inventaire' })

useHead({ title: 'Faire l’inventaire' })

const breadcrumb = [{ label: 'Stock', to: STOCK_PATH }, { label: 'Faire l’inventaire' }]

const { data: stock, error, refresh } = useStock()
const { recordStocktake } = useStockWrites()
const { quantity } = useQuantityFormat()
const events = useEventChoices()

const label = ref('')
const event = ref<number | null>(null)
// What a member typed for each item, by its id: an item left empty is not counted.
const counted = ref<Record<number, string>>({})
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const eventOptions = computed(() => [{ value: null, label: 'Aucun' }, ...events.value])

// The items by category, as the chips go, each with what the stock holds.
const groups = computed(() =>
  STOCK_CATEGORY_VALUES.map(category => ({
    category,
    title: STOCK_CATEGORIES[category].label,
    items: (stock.value?.items ?? [])
      .filter(({ item }) => item.category === category)
      .map(({ item, quantity: held }) => ({ id: item.id, name: item.name, held: `En stock : ${quantity(held, item.unit)}` })),
  })).filter(group => group.items.length > 0),
)

// The items counted, in the order they are sent: the API places an error under
// the position of its count, which leads back to its item, whether it is about
// the item or what was counted.
const sentIds = ref<number[]>([])

function countErrors(id: number): readonly string[] | undefined {
  const position = sentIds.value.indexOf(id)
  if (position < 0) return undefined
  const found = ['item', 'counted'].flatMap(field => errors.value?.fields[`counts.${position}.${field}`] ?? [])
  return found.length > 0 ? found : undefined
}

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

const form = useTemplateRef<HTMLFormElement>('form')

async function submit(): Promise<void> {
  const counts = Object.entries(counted.value).flatMap(([id, text]) => {
    const value = amountInput(text)
    return value === null ? [] : [{ item: Number(id), counted: value }]
  })
  sentIds.value = counts.map(count => count.item)
  pending.value = true
  const result = await recordStocktake({ label: label.value, event: event.value, counts })
  pending.value = false
  if (!result.errors) {
    await navigateTo(STOCK_PATH)
    return
  }
  const shown = new Set([
    'label',
    'event',
    ...counts.flatMap((_count, position) => [`counts.${position}.item`, `counts.${position}.counted`]),
  ])
  errors.value = placeErrors(result.errors, shown, path => path)
  await nextTick()
  form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
}
</script>

<template>
  <div class="flex max-w-160 flex-col gap-5.5">
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <div class="flex flex-col gap-1.5">
      <BoardPageTitle>Faire l’inventaire</BoardPageTitle>
      <p class="text-lead text-argent-600">
        Saisissez ce que vous comptez de chaque article. Un article laissé vide n’est pas compté ; chaque écart devient un mouvement.
      </p>
    </div>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <form
      v-else
      ref="form"
      class="flex flex-col gap-5"
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
      <UiCard>
        <div class="grid gap-3 md:grid-cols-2">
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Libellé"
            optional
            :errors="fieldErrors('label')"
          >
            <UiInput
              :id
              v-model="label"
              placeholder="Ex. Après la brocante"
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Événement"
            optional
            :errors="fieldErrors('event')"
          >
            <UiSelect
              :id
              v-model="event"
              :options="eventOptions"
              :aria-describedby="describedby"
              :invalid
            />
          </UiField>
        </div>
      </UiCard>
      <UiCard
        v-for="group in groups"
        :key="group.category"
        :title="group.title"
        flush
      >
        <ul class="divide-y divide-argent-100">
          <li
            v-for="item in group.items"
            :key="item.id"
            class="flex flex-wrap items-start justify-between gap-3 px-5.5 py-3"
          >
            <span class="flex min-w-0 flex-col gap-0.5 pt-2">
              <span class="text-ui font-semibold text-sable-950">{{ item.name }}</span>
              <span class="text-caption text-argent-600">{{ item.held }}</span>
            </span>
            <UiField
              v-slot="{ id, describedby, invalid }"
              :label="`Compté : ${item.name}`"
              hidden-label
              class="w-32"
              :errors="countErrors(item.id)"
            >
              <UiInput
                :id
                v-model="counted[item.id]"
                inputmode="decimal"
                placeholder="Compté"
                :aria-describedby="describedby"
                :invalid
              />
            </UiField>
          </li>
        </ul>
      </UiCard>
      <div class="flex flex-wrap items-center gap-2">
        <UiButton
          type="submit"
          :loading="pending"
        >
          Enregistrer l’inventaire
        </UiButton>
        <UiButton
          variant="secondary"
          :to="STOCK_PATH"
        >
          Annuler
        </UiButton>
      </div>
    </form>
  </div>
</template>
