<script setup lang="ts">
import { ArrowRightLeft, FileCheck } from '@lucide/vue'

definePageMeta({ path: '/bureau' })

useHead({ title: 'Tableau de bord' })

const session = useSessionStore()
const now = useNow()
const { longDay, countdown, countdownText, calendarWeekday } = useDateFormat()

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
// « 2 en cours », then the first loan due back and those to prepare:
// « École du village : retour ven. 2 oct. · 1 prêt à préparer ».
const loaned = computed(() => data.value?.loans ?? null)
const loanedValue = computed(() => `${loaned.value?.out_count ?? 0} en cours`)
const loanedDetail = computed(() => {
  const shown = loaned.value
  if (!shown) return ''
  const due = shown.next_return
  const parts = [
    due ? `${due.display_name} : ${dueBack(due)}` : '',
    shown.to_prepare_count > 0 ? `${shown.to_prepare_count} prêt${shown.to_prepare_count > 1 ? 's' : ''} à préparer` : '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Aucun prêt en cours ni à préparer.'
})
const movements = computed(() => data.value?.loan_movements ?? [])
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

// « retour ven. 2 oct. », or « en retard depuis le mer. 30 sept. ».
function dueBack(loan: { state: string, end_date: string }): string {
  return loan.state === 'overdue'
    ? `en retard depuis le ${calendarWeekday(addDays(loan.end_date, 1), now.value)}`
    : `retour ${calendarWeekday(loan.end_date, now.value)}`
}
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
          label="Matériel prêté"
          :value="loanedValue"
          :icon="ArrowRightLeft"
          :to="LOANS_PATH"
        >
          {{ loanedDetail }}
        </UiKpiCard>
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
        <div class="flex min-w-0 flex-1 basis-150 flex-col gap-5">
          <DashboardUpcomingEvents
            :events
            :count
            :loading
          />
          <DashboardLoanMovements
            :movements
            :loading
          />
        </div>
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
