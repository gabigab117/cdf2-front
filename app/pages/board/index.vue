<script setup lang="ts">
import { FileCheck } from '@lucide/vue'

definePageMeta({ path: '/bureau' })

useHead({ title: 'Tableau de bord' })

const session = useSessionStore()
const now = useNow()
const { longDay, countdown, countdownText } = useDateFormat()

// The dashboard's figures, shared with the layout. Lazy: the greeting and the
// day wait for no request.
const { data, status, error, refresh } = useBoardOverview()

const classes = {
  kpis: 'grid grid-cols-kpis gap-4',
}

const events = computed(() => data.value?.upcoming_events ?? [])
const notes = computed(() => data.value?.latest_notes ?? [])
const generalTasks = computed(() => data.value?.general_tasks ?? null)
const recentDocuments = computed(() => data.value?.recent_documents ?? [])
const toReview = computed(() => data.value?.pending.documents.counts ?? null)
// « 4 documents », then « 2 factures, 1 commande, 1 compte rendu »: by hand
// until the assistant (phase 9), never « lus par l’assistant ».
const toReviewValue = computed(() => {
  const total = toReview.value?.total ?? 0
  return `${total} document${total > 1 ? 's' : ''}`
})
const toReviewDetail = computed(() =>
  toReview.value && toReview.value.total > 0 ? categoryCounts(toReview.value) : 'Tous les documents sont validés.',
)
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
        v-if="toReview"
        :class="classes.kpis"
      >
        <UiKpiCard
          tone="azur"
          label="À valider"
          :value="toReviewValue"
          :icon="FileCheck"
          :to="TO_REVIEW_LOCATION"
        >
          {{ toReviewDetail }}
        </UiKpiCard>
        <UiKpiCard
          v-if="next"
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
          <div class="flex flex-col gap-2">
            <span class="flex justify-between gap-3">
              Tâches
              <span class="font-mono text-white">{{ next.tasks_done }} / {{ next.tasks_total }}</span>
            </span>
            <UiProgressBar
              :value="next.tasks_done"
              :max="next.tasks_total"
              label="Tâches faites"
              surface="dark"
            />
          </div>
        </UiKpiCard>
      </div>
      <!-- The notes stand beside the events, then under them on a phone. -->
      <div class="flex flex-wrap items-start gap-5">
        <DashboardUpcomingEvents
          class="min-w-0 flex-1 basis-150"
          :events
          :count
          :loading
        />
        <div class="flex min-w-0 flex-1 basis-80 flex-col gap-5 md:max-w-105">
          <DashboardNotes
            :notes
            :loading
          />
          <DashboardGeneralTasks
            v-if="generalTasks"
            :summary="generalTasks"
            @changed="refresh()"
          />
          <DashboardRecentDocuments
            :documents="recentDocuments"
            :loading
          />
        </div>
      </div>
    </template>
  </div>
</template>
