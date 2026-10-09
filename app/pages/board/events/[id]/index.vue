<script setup lang="ts">
import { Calendar, MapPin, User } from '@lucide/vue'
import type { components } from '~/types/api'

definePageMeta({ path: '/bureau/evenements/:id(\\d+)' })

const id = Number(useRoute().params.id)

const { data: event, error, refresh } = await useBoardEvent(id)
if (error.value?.status === 404) showError({ status: 404, statusText: 'Not Found' })

useHead({ title: () => event.value?.title ?? 'Événement' })

const { eventWhen } = useDateFormat()

// The tabs of the other sections join with the phases that fill them.
const TABS = [{ value: 'public', label: 'Infos publiques' }] as const
const tab = ref<typeof TABS[number]['value']>('public')

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
      <UiButton :to="eventEditPath(event.id)">
        Modifier
      </UiButton>
    </div>
    <UiTabs
      v-model="tab"
      :tabs="TABS"
      label="Sections de l’événement"
    >
      <EventsPublicInfoForm
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
