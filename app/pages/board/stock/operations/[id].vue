<script setup lang="ts">
import type { components } from '~/types/api'

type StockCostIn = components['schemas']['StockCostIn']

definePageMeta({ path: '/bureau/stock/operations/:id(\\d+)' })

const id = Number(useRoute().params.id)

const { data: operation, error, refresh } = useStockOperation(() => id)
// The operation comes once the page shows: one that does not exist turns it
// into the page not found.
watch(error, (failure) => {
  if (failure?.status === 404) showError({ status: 404, statusText: 'Not Found' })
})

const { writtenDay, calendarDay } = useDateFormat()
const { amount } = useMoneyFormat()
const { updateCosts } = useStockWrites()
const now = useNow()

const title = computed(() => (operation.value ? operationTitle(operation.value) : 'Opération du stock'))
useHead({ title: () => title.value })

const breadcrumb = computed(() => [
  { label: 'Stock', to: STOCK_PATH },
  { label: 'Opérations', to: OPERATIONS_PATH },
  { label: title.value },
])

// « Achat · 12 sept. · Julie R. · Brocante »
const subtitle = computed(() => {
  if (!operation.value) return ''
  const { reason, created_at, author, event } = operation.value
  return [STOCK_REASONS[reason], writtenDay(created_at, now.value), memberSignature(author), event?.title].filter(Boolean).join(' · ')
})

// The costs of a purchase or a delivery are completed, then corrected (D16);
// those of a purchase an expense paid, from that expense.
const editing = ref(false)
const costsLabel = computed(() => (operation.value?.unpriced ? 'Compléter les prix' : 'Corriger les prix'))
const correctable = computed(() => Boolean(operation.value?.priceable && !operation.value.expense))

// « Cette opération est payée par la dépense « Courses buvette » du 12 sept.,
// 50,00 € : ses prix se corrigent depuis elle. », and the way to that expense.
const expenseNote = computed(() => {
  const expense = operation.value?.expense
  if (!expense) return null
  return {
    text: `Cette opération est payée par la dépense « ${expense.label} » du ${calendarDay(expense.date, now.value)}, ${amount(expense.amount)} : ses prix se corrigent depuis elle.`,
    to: entryPath(expense.id),
  }
})

async function saveCosts(lines: StockCostIn[]) {
  const result = await updateCosts(id, lines)
  if (result.errors) return result.errors
  operation.value = result.data
  editing.value = false
  return null
}
</script>

<template>
  <div class="flex max-w-200 flex-col gap-5.5">
    <template v-if="operation">
      <UiBreadcrumb
        :items="breadcrumb"
        back
      />
      <div class="flex flex-col gap-1.5">
        <BoardPageTitle>{{ title }}</BoardPageTitle>
        <p class="text-lead text-argent-600">
          {{ subtitle }}
        </p>
      </div>
      <UiCard
        v-if="editing"
        title="Prix des lignes"
      >
        <StockCostsForm
          :operation
          :save="saveCosts"
          submit-label="Enregistrer les prix"
          @cancel="editing = false"
        />
      </UiCard>
      <UiCard
        v-else
        title="Lignes"
        flush
      >
        <template
          v-if="correctable"
          #actions
        >
          <UiButton
            variant="secondary"
            size="sm"
            @click="editing = true"
          >
            {{ costsLabel }}
          </UiButton>
        </template>
        <StockOperationLines :operation />
      </UiCard>
      <p
        v-if="expenseNote"
        class="text-ui text-sable-800"
      >
        {{ expenseNote.text }}
        <BoardTextLink
          :to="expenseNote.to"
          label="Voir la dépense"
        />
      </p>
    </template>
    <BoardLoadError
      v-else-if="error && error.status !== 404"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
