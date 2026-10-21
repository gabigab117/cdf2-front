<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// What an expense put in stock (D16), on its page: a purchase it records
// (« Mettre en stock »), or one the stock recorded already (« Achat déjà
// saisi »), whose costs it pays. Once linked: their sum, what is left of the
// expense outside the stock, and « Retirer », after a click too many.
const { entry } = defineProps<{ entry: LedgerEntryOut }>()

const emit = defineEmits<{ changed: [entry: LedgerEntryOut] }>()

const { unlinkStockPurchase } = useTreasuryWrites()
const { amount } = useMoneyFormat()
const { writtenDay } = useDateFormat()
const now = useNow()

const form = ref<'create' | 'link' | 'costs' | null>(null)
// The buttons in place: the focus comes back to the one that opened a form;
// once the purchase is linked, to « Corriger les prix », and once it is let
// go, to « Mettre en stock ».
const createTrigger = useTemplateRef<ComponentPublicInstance>('createTrigger')
const linkTrigger = useTemplateRef<ComponentPublicInstance>('linkTrigger')
const costsTrigger = useTemplateRef<ComponentPublicInstance>('costsTrigger')
const unlinkTrigger = useTemplateRef<ComponentPublicInstance>('unlinkTrigger')
const triggers = { create: createTrigger, link: linkTrigger, costs: costsTrigger }
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(
  computed(() => unlinkTrigger.value ?? createTrigger.value),
)

// « Achat du 12 sept. »
const purchaseDay = computed(() => {
  const purchase = entry.stock_purchase
  return purchase ? `${STOCK_REASONS[purchase.reason]} du ${writtenDay(purchase.created_at, now.value)}` : ''
})
const rows = computed(() => [
  { label: 'Mis en stock', value: amount(entry.stocked_cost) },
  { label: 'Reste hors stock', value: amount(entry.unstocked_cost) },
])

async function closed(updated?: LedgerEntryOut): Promise<void> {
  const trigger = updated ? costsTrigger : triggers[form.value ?? 'create']
  form.value = null
  if (updated) emit('changed', updated)
  await focusTrigger(trigger)
}

async function unlink(): Promise<void> {
  const done = await confirm(async () => {
    const result = await unlinkStockPurchase(entry.id)
    if (result.errors) return refusalText(result.errors)
    emit('changed', result.data)
    return null
  })
  if (done) await dismiss()
}
</script>

<template>
  <UiCard title="Stock">
    <template v-if="entry.stock_purchase">
      <div class="flex flex-col gap-0.5">
        <span class="text-ui font-medium text-sable-950">{{ operationTitle(entry.stock_purchase) }}</span>
        <span class="text-caption text-argent-600">{{ purchaseDay }}</span>
      </div>
      <dl class="flex flex-col">
        <UiDetailRow
          v-for="row in rows"
          :key="row.label"
          :label="row.label"
          :value="row.value"
        />
      </dl>
    </template>
    <p
      v-else
      class="text-sm text-argent-600"
    >
      Aucun achat du stock n’est rattaché à cette dépense.
    </p>
    <div
      v-if="form"
      class="flex flex-col gap-3.5 rounded-field border border-argent-200 bg-argent-25 p-3.5"
    >
      <TreasuryStockPurchaseForm
        v-if="form === 'create'"
        :entry
        @saved="closed"
        @cancel="closed()"
      />
      <TreasuryExistingPurchaseForm
        v-else-if="form === 'link'"
        :entry
        @saved="closed"
        @cancel="closed()"
      />
      <TreasuryPurchaseCostsForm
        v-else-if="entry.stock_purchase"
        :entry
        :operation="entry.stock_purchase.id"
        submit-label="Enregistrer les prix"
        @saved="closed"
        @cancel="closed()"
      />
    </div>
    <UiConfirmation
      v-else-if="confirming"
      question="Retirer cet achat de la dépense ?"
      action="Retirer"
      keep="Garder l’achat"
      :pending
      :failure
      @confirm="unlink"
      @cancel="dismiss"
    >
      <p>Il reste dans le stock, avec ses prix.</p>
    </UiConfirmation>
    <div
      v-else-if="entry.stock_purchase"
      class="flex flex-wrap gap-2"
    >
      <UiButton
        variant="secondary"
        size="sm"
        :to="operationPath(entry.stock_purchase.id)"
      >
        Voir l’achat
      </UiButton>
      <UiButton
        ref="costsTrigger"
        variant="secondary"
        size="sm"
        @click="form = 'costs'"
      >
        Corriger les prix
      </UiButton>
      <UiButton
        ref="unlinkTrigger"
        variant="secondary"
        size="sm"
        @click="ask"
      >
        Retirer
      </UiButton>
    </div>
    <div
      v-else
      class="flex flex-wrap gap-2"
    >
      <UiButton
        ref="createTrigger"
        variant="secondary"
        size="sm"
        @click="form = 'create'"
      >
        Mettre en stock
      </UiButton>
      <UiButton
        ref="linkTrigger"
        variant="secondary"
        size="sm"
        @click="form = 'link'"
      >
        Achat déjà saisi
      </UiButton>
    </div>
  </UiCard>
</template>
