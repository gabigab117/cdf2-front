<script setup lang="ts">
import { ArrowRightLeft, CircleAlert, ClipboardCheck } from '@lucide/vue'
import type { components } from '~/types/api'
import type { StockFilter, StockQuery } from '~/utils/stock'

type StockDirection = components['schemas']['StockDirection']

// « Entrée ou sortie » stands in the top bar, in place of « Nouveau », as in the mockup.
definePageMeta({ path: '/bureau/stock', topBarAction: true })

useHead({ title: 'Stock' })

// How long the search waits for the typing to pause before it applies.
const SEARCH_DELAY_MS = 300

const route = useRoute()
const now = useNow()
const query = computed(() => parseStockQuery(route.query))

const { data: stock, status, error, refresh } = useStock()
const { adjustItem } = useStockWrites()
const { writtenDay } = useDateFormat()

const loading = computed(() => status.value === 'pending')
const items = computed(() => shownItems(stock.value?.items ?? [], query.value))
const recent = computed(() => stock.value?.recent_operations ?? [])
const shopping = computed(() => stock.value?.shopping_list ?? [])
const emptyText = computed(() =>
  query.value.filter !== null || query.value.search !== ''
    ? 'Aucun article ne correspond à cette recherche.'
    : 'Aucun article pour l’instant.',
)

// « dernier inventaire le 14 sept. (Brocante) »: the event of the stocktake,
// when it had one, stands in brackets.
const subtitle = computed(() => {
  const stocktake = stock.value?.last_stocktake
  if (!stocktake) return 'Marchandises de la buvette et des animations'
  const event = stocktake.event ? ` (${stocktake.event.title})` : ''
  return `Marchandises de la buvette et des animations · dernier inventaire le ${writtenDay(stocktake.created_at, now.value)}${event}`
})

// Every item, those below their threshold in amber, then each category.
const chips = computed(() => {
  const counts = stock.value?.counts
  return [
    { label: 'Tout', filter: null as StockFilter, count: counts?.total, tone: 'neutral' as const },
    { label: 'Sous le seuil', filter: 'low' as StockFilter, count: counts?.low, tone: 'ambre' as const },
    ...STOCK_CATEGORY_VALUES.map(category => ({
      label: STOCK_CATEGORIES[category].label,
      filter: category as StockFilter,
      count: counts?.[category],
      tone: 'neutral' as const,
    })),
  ]
})

function location(changes: Partial<StockQuery>) {
  return { query: stockQuery({ ...query.value, ...changes }) }
}

// The search applies once the typing pauses, and the address keeps it.
const search = ref(query.value.search)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (text) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (text !== query.value.search) navigateTo(location({ search: text }), { replace: true })
  }, SEARCH_DELAY_MS)
})
// Back or forward in the history brings its search into the field.
watch(() => query.value.search, (text) => {
  search.value = text
})
onBeforeUnmount(() => clearTimeout(searchTimer))

// A click on − or + is sent one at a time; a refusal, such as nothing left,
// shows above the stock.
const sending = ref(false)
const failure = ref<string | null>(null)

async function adjust(id: number, direction: StockDirection): Promise<void> {
  sending.value = true
  failure.value = await adjustItem(id, direction)
  sending.value = false
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <Teleport
      defer
      to="#board-top-bar-action"
    >
      <BoardTopBarButton
        :icon="ArrowRightLeft"
        label="Entrée ou sortie"
        :to="OPERATION_PATH"
      />
    </Teleport>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1.5">
        <BoardPageTitle>Stock</BoardPageTitle>
        <p class="text-lead text-argent-600">
          {{ subtitle }}
        </p>
      </div>
      <UiButton
        variant="secondary"
        :to="STOCKTAKE_PATH"
      >
        <ClipboardCheck
          :size="18"
          aria-hidden="true"
        />
        Faire l’inventaire
      </UiButton>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <nav
        aria-label="Filtrer le stock"
        class="flex flex-wrap gap-2"
      >
        <UiFilterChip
          v-for="chip in chips"
          :key="chip.label"
          :pressed="query.filter === chip.filter"
          :count="chip.count"
          :tone="chip.tone"
          :to="location({ filter: chip.filter })"
        >
          {{ chip.label }}
        </UiFilterChip>
      </nav>
      <UiSearchInput
        v-model="search"
        class="w-full md:w-70"
        label="Rechercher un article"
        placeholder="Rechercher un article"
      />
    </div>
    <UiCallout
      v-if="failure"
      tone="ambre"
      role="alert"
      :icon="CircleAlert"
    >
      {{ failure }}
    </UiCallout>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <div
      v-else
      class="flex flex-wrap items-start gap-5"
    >
      <UiCard
        flush
        class="min-w-0 flex-1 basis-160"
        :aria-busy="loading || undefined"
      >
        <StockTable
          v-if="items.length > 0"
          :items
          :sending
          @adjust="adjust"
        />
        <UiEmptyState v-else-if="!loading">
          {{ emptyText }}
        </UiEmptyState>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-argent-100 px-5 py-3.5 text-note text-argent-600">
          <span>Les boutons − et + enregistrent un mouvement daté avec votre nom.</span>
          <NuxtLink
            :to="NEW_ITEM_PATH"
            class="font-medium text-azur-600 hover:text-azur-700"
          >
            Ajouter un article
          </NuxtLink>
        </div>
      </UiCard>
      <div class="flex min-w-0 flex-1 basis-85 flex-col gap-5 md:max-w-100">
        <StockShoppingList :lines="shopping" />
        <StockRecentOperations :operations="recent" />
      </div>
    </div>
  </div>
</template>
