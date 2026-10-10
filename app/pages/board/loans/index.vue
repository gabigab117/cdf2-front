<script setup lang="ts">
import { Plus } from '@lucide/vue'
import type { LoansQuery } from '~/utils/loans'

definePageMeta({ path: '/bureau/prets', topBarAction: true })

useHead({ title: 'Prêts' })

const route = useRoute()
const query = computed(() => parseLoansQuery(route.query))

const { data: page, status, error, refresh } = useLoanList(() => query.value)
const { data: counts, refresh: refreshCounts } = useLoanCounts()

const loans = computed(() => page.value?.items ?? [])
const pageCount = computed(() => Math.ceil((page.value?.count ?? 0) / LOANS_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')
const emptyText = computed(() => (query.value.state === null ? 'Aucun prêt pour l’instant.' : 'Aucun prêt dans cet état.'))

function location(changes: Partial<LoansQuery>) {
  return { query: loansQuery({ ...query.value, ...changes }) }
}

function loanLink(id: number) {
  return location({ loan: id })
}

function pageLocation(target: number) {
  return location({ page: target })
}

const chips = computed(() => [
  { label: 'Tous', state: null, count: counts.value?.total },
  ...LOAN_STATE_VALUES.flatMap((state) => {
    const chip = LOAN_STATES[state].chip
    return chip ? [{ label: chip, state, count: counts.value?.[state] }] : []
  }),
])

// A write changes the list, its counts, and what awaits the board.
function changed(): void {
  void refresh()
  void refreshCounts()
}

async function close(): Promise<void> {
  await navigateTo(location({ loan: null }))
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <Teleport
      defer
      to="#board-top-bar-action"
    >
      <BoardTopBarButton
        :icon="Plus"
        label="Nouveau prêt"
        :to="NEW_LOAN_PATH"
      />
    </Teleport>
    <div
      class="flex flex-col gap-1.5"
      :class="{ 'max-md:hidden': query.loan !== null }"
    >
      <BoardPageTitle>Prêts de matériel</BoardPageTitle>
      <p class="text-lead text-argent-600">
        Les réservations des événements du comité apparaissent ici aussi : elles bloquent le matériel comme un prêt.
      </p>
    </div>
    <div class="flex flex-wrap items-start gap-5">
      <UiCard
        flush
        class="min-w-0 flex-1 basis-155"
        :class="{ 'max-md:hidden': query.loan !== null }"
        :aria-busy="loading || undefined"
      >
        <div class="flex flex-col gap-3 border-b border-argent-100 px-5.5 py-4.5">
          <h2 class="text-title font-semibold">
            Tous les prêts
          </h2>
          <nav
            aria-label="États"
            class="flex flex-wrap gap-1.5"
          >
            <UiFilterChip
              v-for="chip in chips"
              :key="chip.label"
              size="sm"
              :pressed="query.state === chip.state"
              :count="chip.count"
              :to="location({ state: chip.state, page: 1, loan: null })"
            >
              {{ chip.label }}
            </UiFilterChip>
          </nav>
        </div>
        <BoardLoadError
          v-if="error"
          class="m-5.5"
          :message="error.message"
          @retry="refresh()"
        />
        <LoansList
          v-else-if="loans.length > 0"
          :loans
          :selected="query.loan"
          :location="loanLink"
        />
        <UiEmptyState v-else-if="!loading">
          {{ emptyText }}
        </UiEmptyState>
        <UiPagination
          class="px-5.5 pb-4"
          :page="query.page"
          :page-count
          :to="pageLocation"
        />
      </UiCard>
      <LoansPanel
        v-if="query.loan !== null"
        :id="query.loan"
        :key="query.loan"
        class="min-w-0 flex-1 basis-82 md:max-w-100"
        @changed="changed"
        @close="close"
      />
    </div>
  </div>
</template>
