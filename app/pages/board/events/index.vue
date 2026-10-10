<script setup lang="ts">
import { Plus } from '@lucide/vue'

definePageMeta({ path: '/bureau/evenements' })

useHead({ title: 'Événements' })

const PERIODS = [
  { value: 'upcoming', label: 'À venir' },
  { value: 'past', label: 'Passés' },
] as const

const route = useRoute()

// The period and the page live in the address: the browser's back button
// returns to them, and a page of the list can be kept as a link.
const query = computed(() => parseEventListQuery(route.query))

const period = computed({
  get: () => query.value.period,
  set: period => navigateTo({ query: eventListQuery({ period, page: 1 }) }),
})

const { data, status, error, refresh } = await useAsyncData(
  () => `board:events:${query.value.period}:${query.value.page}`,
  (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events', {
      params: { query: { period: query.value.period, page: query.value.page, page_size: EVENTS_PAGE_SIZE } },
      signal,
    })),
)

const events = computed(() => data.value?.items ?? [])
const count = computed(() => data.value?.count ?? 0)
const pageCount = computed(() => Math.ceil(count.value / EVENTS_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')
// A page past the end of the list, such as an old link, holds nothing.
const beyondTheEnd = computed(() => events.value.length === 0 && count.value > 0)
const emptyMessage = computed(() =>
  query.value.period === 'upcoming' ? 'Aucun événement à venir.' : 'Aucun événement passé.',
)

function pageLocation(page: number) {
  return { query: eventListQuery({ period: query.value.period, page }) }
}

// Only the address changes from a page to the next: the list is shown from its top.
watch(() => query.value.page, () => window.scrollTo({ top: 0 }))
</script>

<template>
  <div class="flex flex-col gap-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <BoardPageTitle>Événements</BoardPageTitle>
      <UiButton :to="NEW_EVENT_PATH">
        <Plus :size="18" />
        Créer un événement
      </UiButton>
    </div>
    <UiSegmentedControl
      v-model="period"
      :options="PERIODS"
      label="Période"
      class="self-start"
    />
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <template v-else>
      <UiCard
        flush
        :aria-busy="loading || undefined"
      >
        <ul
          v-if="events.length > 0"
          class="divide-y divide-argent-100"
        >
          <li
            v-for="event in events"
            :key="event.id"
          >
            <EventsListItem :event />
          </li>
        </ul>
        <UiEmptyState
          v-else-if="beyondTheEnd"
        >
          Cette page ne contient aucun événement.
          <NuxtLink
            :to="pageLocation(1)"
            class="font-medium text-azur-600 hover:text-azur-700"
          >
            Revenir à la première page
          </NuxtLink>
        </UiEmptyState>
        <UiEmptyState
          v-else-if="!loading"
        >
          {{ emptyMessage }}
        </UiEmptyState>
      </UiCard>
      <UiPagination
        :page="query.page"
        :page-count="pageCount"
        :to="pageLocation"
      />
    </template>
  </div>
</template>
