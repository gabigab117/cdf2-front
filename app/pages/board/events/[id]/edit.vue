<script setup lang="ts">
import type { components } from '~/types/api'

definePageMeta({ path: '/bureau/evenements/:id(\\d+)/modifier' })

const id = Number(useRoute().params.id)

const { data: event, error, refresh } = await useBoardEvent(id)
if (error.value?.status === 404) showError({ status: 404, statusText: 'Not Found' })

useHead({ title: 'Modifier l’événement' })

const breadcrumb = computed(() => [
  { label: 'Événements', to: EVENTS_PATH },
  { label: event.value?.title ?? '', to: eventPath(id) },
  { label: 'Modifier' },
])

// The event's page shows it as saved, without asking the API again, in place
// of the form: going back leads to the list.
async function open(saved: components['schemas']['EventOut']): Promise<void> {
  event.value = saved
  await navigateTo(eventPath(id), { replace: true })
}
</script>

<template>
  <div
    v-if="event"
    class="flex flex-col gap-6"
  >
    <UiBreadcrumb :items="breadcrumb" />
    <BoardPageTitle>Modifier l’événement</BoardPageTitle>
    <EventsGeneralForm
      :event
      @saved="open"
    />
    <EventsDeletion :event />
  </div>
  <BoardLoadError
    v-else-if="error"
    :message="error.message"
    @retry="refresh()"
  />
</template>
