<script setup lang="ts">
import type { components } from '~/types/api'

definePageMeta({ path: '/bureau/evenements/nouveau' })

useHead({ title: 'Nouvel événement' })

const BREADCRUMB = [{ label: 'Événements', to: EVENTS_PATH }, { label: 'Nouvel événement' }]

// The event created opens in place of the form: going back leads to the list.
async function open(event: components['schemas']['EventOut']): Promise<void> {
  await navigateTo(eventPath(event.id), { replace: true })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBreadcrumb :items="BREADCRUMB" />
    <BoardPageTitle>Nouvel événement</BoardPageTitle>
    <EventsGeneralForm @saved="open" />
  </div>
</template>
