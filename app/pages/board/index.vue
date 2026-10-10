<script setup lang="ts">
definePageMeta({ path: '/bureau' })

useHead({ title: 'Tableau de bord' })

const session = useSessionStore()
const now = useNow()
const { longDay, countdown, countdownText } = useDateFormat()

// The dashboard's figures, read by this page alone: its key lives here, as the
// list's does. Lazy: the greeting and the day wait for no request.
const { data, status, error, refresh } = useLazyAsyncData(
  'board:overview',
  (_nuxtApp, { signal }) => loadData(useApi().GET('/api/board/overview', { signal })),
)

const classes = {
  kpis: 'grid grid-cols-kpis gap-4',
}

const events = computed(() => data.value?.upcoming_events ?? [])
const count = computed(() => data.value?.upcoming_events_count ?? 0)
const loading = computed(() => status.value === 'pending')
const next = computed(() => events.value[0] ?? null)
const nextCountdown = computed(() => (next.value ? countdown(next.value, now.value) : null))

const greeting = computed(() => memberGreeting(session.member))
// « Jeudi 1er octobre · Halloween dans 30 jours », or the day alone.
const today = computed(() => longDay(new Date(now.value).toISOString(), { sentence: true }))
const dateLine = computed(() =>
  next.value && nextCountdown.value
    ? `${today.value} · ${next.value.title} ${countdownText(nextCountdown.value, 'inline')}`
    : today.value,
)
const nextPill = computed(() => (nextCountdown.value ? countdownText(nextCountdown.value, 'short') : ''))
</script>

<template>
  <div class="flex flex-col gap-7">
    <div class="flex flex-col gap-2">
      <BoardPageTitle>{{ greeting }}</BoardPageTitle>
      <p class="text-base text-argent-600">
        {{ dateLine }}
      </p>
    </div>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <template v-else>
      <div
        v-if="next"
        :class="classes.kpis"
      >
        <UiKpiCard
          tone="dark"
          label="Prochain événement"
          :value="next.title"
          :to="eventPath(next.id)"
        >
          <template #aside>
            <UiStatusPill
              tone="accent"
              size="md"
              class="font-mono"
            >
              {{ nextPill }}
            </UiStatusPill>
          </template>
        </UiKpiCard>
      </div>
      <DashboardUpcomingEvents
        :events
        :count
        :loading
      />
    </template>
  </div>
</template>
