<script setup lang="ts">
import { Calendar, MapPin } from '@lucide/vue'
import type { components } from '~/types/api'

const { event } = defineProps<{ event: components['schemas']['PublicEventOut'] }>()

const { eventDays, schedule } = useDateFormat()
const { contact } = useRuntimeConfig().public

// The calendar file is served by the API, outside of the site's pages.
const calendarFile = computed(() => `/api/public/events/${event.slug}.ics`)
const position = computed(() =>
  event.latitude !== null && event.longitude !== null ? { latitude: event.latitude, longitude: event.longitude } : null,
)
</script>

<!-- The facts of an event, beside its page: when, where, how much. -->
<template>
  <aside
    aria-label="En bref"
    class="flex flex-col gap-4"
  >
    <div class="flex flex-col rounded-hero border border-argent-200 bg-white p-2 shadow-float">
      <p class="flex gap-3.5 p-4">
        <span class="inline-flex size-11 shrink-0 items-center justify-center rounded-search bg-argent-150">
          <Calendar
            :size="20"
            aria-hidden="true"
          />
        </span>
        <span class="flex flex-col">
          <span class="font-semibold">{{ eventDays(event) }}</span>
          <span class="text-ui text-argent-600">{{ schedule(event) }}</span>
        </span>
      </p>
      <p class="flex gap-3.5 border-t border-argent-100 p-4">
        <span class="inline-flex size-11 shrink-0 items-center justify-center rounded-search bg-argent-150">
          <MapPin
            :size="20"
            aria-hidden="true"
          />
        </span>
        <span class="flex flex-col">
          <span class="font-semibold">{{ event.venue_name }}</span>
          <span
            v-if="event.venue_address"
            class="text-ui text-argent-600"
          >{{ event.venue_address }}</span>
        </span>
      </p>
      <p
        v-if="event.price_label || event.price_detail"
        class="flex gap-3.5 border-t border-argent-100 p-4"
      >
        <span
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-search bg-argent-150 font-mono font-semibold"
          aria-hidden="true"
        >€</span>
        <span class="flex flex-col">
          <span class="font-semibold">{{ event.price_label }}</span>
          <span
            v-if="event.price_detail"
            class="text-ui text-argent-600"
          >{{ event.price_detail }}</span>
        </span>
      </p>
      <SiteMapPreview
        v-if="position"
        v-bind="position"
        :venue="event.venue_name"
        class="mx-2 mt-1 mb-2 w-auto"
      />
      <div class="flex gap-2 p-2">
        <UiButton
          variant="secondary"
          size="lg"
          :to="calendarFile"
          external
          class="flex-1"
        >
          <Calendar
            :size="18"
            aria-hidden="true"
          />
          Mon agenda
        </UiButton>
        <SiteShareButton :title="event.title" />
      </div>
    </div>
    <p
      v-if="contact.email"
      class="px-3 text-note text-argent-600"
    >
      Une question ? Écrivez au comité :
      <SiteTextLink
        :to="`mailto:${contact.email}`"
        :label="contact.email"
      />
    </p>
  </aside>
</template>
