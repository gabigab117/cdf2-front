<script setup lang="ts">
import { Calendar, Eye, Lock, MapPin, User } from '@lucide/vue'
import type { components } from '~/types/api'

definePageMeta({ path: '/bureau/evenements/:id(\\d+)' })

const id = Number(useRoute().params.id)

const { data: event, error, refresh } = await useBoardEvent(id)
if (error.value?.status === 404) showError({ status: 404, statusText: 'Not Found' })

useHead({ title: () => event.value?.title ?? 'Événement' })

const { eventWhen } = useDateFormat()

const route = useRoute()

// The tab shown and the page of its list live in the address: « Voir les N
// tâches » leads there, and a page of a list can be kept as a link.
const query = computed(() => parseEventPageQuery(route.query))

const tab = computed({
  get: () => query.value.tab,
  set: tab => navigateTo({ query: eventPageQuery({ tab, page: 1 }) }, { replace: true }),
})

const { data: dashboard } = useEventDashboard(id)

// The tabs of the other sections join with the phases that fill them; the
// notes come first, as in the mockup, and the public information last.
const tabs = computed(() => [
  { value: 'notes' as const, label: 'Notes du bureau', icon: Lock, count: dashboard.value ? String(dashboard.value.notes_count) : undefined },
  { value: 'tasks' as const, label: 'Tâches', count: dashboard.value ? `${dashboard.value.tasks_done}/${dashboard.value.tasks_total}` : undefined },
  { value: 'stations' as const, label: 'Postes', count: dashboard.value ? `${dashboard.value.assigned_count}/${dashboard.value.required_count}` : undefined },
  { value: 'reservations' as const, label: 'Réservations', count: dashboard.value ? seatsCount(dashboard.value) : undefined },
  { value: 'public' as const, label: 'Infos publiques' },
])

const breadcrumb = computed(() => [{ label: 'Événements', to: EVENTS_PATH }, { label: event.value?.title ?? '' }])
const when = computed(() => (event.value ? eventWhen(event.value, { sentence: true }) : ''))
const category = computed(() => (event.value ? EVENT_CATEGORIES[event.value.category] : ''))
const lead = computed(() => (event.value?.lead ? memberShortName(event.value.lead) : null))

// The page shows the event as saved, without asking the API again.
function show(saved: components['schemas']['EventOut']): void {
  event.value = saved
}
</script>

<template>
  <div
    v-if="event"
    class="flex flex-col gap-6"
  >
    <UiBreadcrumb :items="breadcrumb" />
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div class="flex min-w-0 flex-col gap-3.5">
        <div class="flex flex-wrap gap-2">
          <EventsPublicationPill
            :published="event.published"
            detailed
          />
          <UiStatusPill
            tone="outline"
            size="lg"
          >
            {{ category }}
          </UiStatusPill>
        </div>
        <BoardPageTitle>{{ event.title }}</BoardPageTitle>
        <div class="flex flex-wrap gap-x-5.5 gap-y-2 text-ui text-sable-600">
          <span class="inline-flex items-center gap-1.75">
            <Calendar
              :size="16"
              aria-hidden="true"
            />
            {{ when }}
          </span>
          <span class="inline-flex items-center gap-1.75">
            <MapPin
              :size="16"
              aria-hidden="true"
            />
            {{ event.venue_name }}
          </span>
          <span
            v-if="lead"
            class="inline-flex items-center gap-1.75"
          >
            <User
              :size="16"
              aria-hidden="true"
            />
            Responsable : {{ lead }}
          </span>
        </div>
      </div>
      <div class="flex gap-2">
        <!-- Only a published event has a public page. -->
        <UiButton
          v-if="event.published"
          variant="secondary"
          :to="publicEventPath(event.slug)"
        >
          <Eye
            :size="16"
            aria-hidden="true"
          />
          Page publique
        </UiButton>
        <UiButton :to="eventEditPath(event.id)">
          Modifier
        </UiButton>
      </div>
    </div>
    <UiTabs
      v-model="tab"
      :tabs
      label="Sections de l’événement"
    >
      <!-- The notes have the event's other figures beside them, as in the mockup. -->
      <div
        v-if="tab === 'notes'"
        class="flex flex-wrap items-start gap-5"
      >
        <NotesTab
          class="flex-1 basis-150"
          :event
          :page="query.page"
        />
        <aside class="flex min-w-0 flex-1 basis-80 flex-col gap-4 md:max-w-100">
          <TasksBlock :event-id="event.id" />
        </aside>
      </div>
      <TasksTab
        v-else-if="tab === 'tasks'"
        :event
        :page="query.page"
      />
      <StationsTab
        v-else-if="tab === 'stations'"
        :event
      />
      <ReservationsTab
        v-else-if="tab === 'reservations'"
        :event
        :page="query.page"
      />
      <EventsPublicInfoForm
        v-else
        :event
        @saved="show"
      />
    </UiTabs>
  </div>
  <BoardLoadError
    v-else-if="error"
    :message="error.message"
    @retry="refresh()"
  />
</template>
