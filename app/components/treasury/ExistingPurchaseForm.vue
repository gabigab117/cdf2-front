<script setup lang="ts">
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// « Achat déjà saisi » (D16): a purchase or a delivery of the stock that the
// expense paid, chosen among those no expense pays yet, then the cost of each
// of its lines.
const { entry } = defineProps<{ entry: LedgerEntryOut }>()

const emit = defineEmits<{ saved: [entry: LedgerEntryOut], cancel: [] }>()

const { data: purchases, error, refresh } = useUnlinkedPurchases()
const { writtenDay } = useDateFormat()
const now = useNow()

const chosen = ref<number | ''>('')

// « Achat du 12 sept. · Courses buvette »
const options = computed(() => (purchases.value?.items ?? []).map(operation => ({
  value: operation.id,
  label: [`${STOCK_REASONS[operation.reason]} du ${writtenDay(operation.created_at, now.value)}`, operation.label].filter(Boolean).join(' · '),
})))
const none = computed(() => purchases.value?.count === 0)
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <p
      v-else-if="none"
      class="text-sm text-argent-600"
    >
      Aucun achat ni réception du stock n’attend sa dépense.
    </p>
    <UiField
      v-else
      v-slot="{ control }"
      label="Achat ou réception du stock"
    >
      <UiSelect
        v-bind="control"
        v-model="chosen"
        :options
        placeholder="Choisir un achat"
        required
      />
    </UiField>
    <TreasuryPurchaseCostsForm
      v-if="chosen !== ''"
      :key="chosen"
      :entry
      :operation="chosen"
      submit-label="Rattacher l’achat"
      @saved="emit('saved', $event)"
      @cancel="emit('cancel')"
    />
    <UiButton
      v-else
      variant="secondary"
      size="sm"
      class="self-start"
      @click="emit('cancel')"
    >
      Annuler
    </UiButton>
  </div>
</template>
