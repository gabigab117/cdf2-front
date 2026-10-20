<script setup lang="ts">
import { Check, PackageCheck } from '@lucide/vue'
import type { components } from '~/types/api'

type StockOrderOut = components['schemas']['StockOrderOut']

// « Commande à réceptionner »: an order validated with its lines, received in
// one click, then « Ajouté au stock », which « Annuler » undoes the same day.
// Before the assistant, nothing tells it was read by one (A6).
const { order } = defineProps<{ order: StockOrderOut }>()

const { calendarInWords } = useDateFormat()
const { deliverOrder } = useStockWrites()
const now = useNow()
const titleId = useId()

// « Commande Confiserie du Nord. Livraison prévue le 27 octobre. »
const summary = computed(() => {
  const name = order.issuer ? `Commande ${order.issuer}.` : `${order.title}.`
  return order.delivery_date ? `${name} Livraison prévue le ${calendarInWords(order.delivery_date, now.value)}.` : name
})

const pending = ref(false)
const failure = ref<string | null>(null)

async function deliver(cancel: boolean): Promise<void> {
  pending.value = true
  failure.value = await deliverOrder(order.id, cancel)
  pending.value = false
}
</script>

<template>
  <section
    class="flex flex-col gap-3.5 rounded-card border border-azur-200 bg-azur-50 p-5"
    :aria-labelledby="titleId"
  >
    <div class="flex flex-wrap items-center justify-between gap-2.5">
      <h2
        :id="titleId"
        class="flex items-center gap-2 text-base font-semibold whitespace-nowrap text-azur-900"
      >
        <PackageCheck
          :size="17"
          aria-hidden="true"
          class="text-azur-600"
        />
        Commande à réceptionner
      </h2>
      <UiStatusPill
        v-if="order.event"
        tone="white"
      >
        {{ order.event.title }}
      </UiStatusPill>
    </div>
    <p class="text-sm text-sable-800">
      {{ summary }}
    </p>
    <StockOrderLineList
      :lines="order.lines"
      class="text-sm"
    />
    <UiButton
      v-if="!order.delivery"
      variant="accent"
      block
      :loading="pending"
      @click="deliver(false)"
    >
      <Check
        :size="17"
        aria-hidden="true"
      />
      Réceptionner la livraison
    </UiButton>
    <div
      v-else
      class="flex h-11 items-center justify-between gap-2.5 rounded-field bg-white px-3.5 text-sm font-medium text-azur-900"
    >
      <span class="inline-flex items-center gap-2">
        <Check
          :size="17"
          aria-hidden="true"
          class="text-azur-600"
        />
        Ajouté au stock
      </span>
      <UiButton
        v-if="order.undoable"
        variant="link"
        :loading="pending"
        @click="deliver(true)"
      >
        Annuler
      </UiButton>
    </div>
    <p
      v-if="failure"
      role="alert"
      class="text-note font-semibold text-ambre-800"
    >
      {{ failure }}
    </p>
  </section>
</template>
