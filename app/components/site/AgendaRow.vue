<script setup lang="ts">
import { ArrowRight, ChevronRight, Clock, MapPin } from '@lucide/vue'
import type { components } from '~/types/api'

const { event } = defineProps<{ event: components['schemas']['PublicEventItemOut'] }>()

const { dayParts, time, schedule } = useDateFormat()

const parts = computed(() => dayParts(event.starts_at))
</script>

<!-- A row of the agenda: its day in large, then the event, a link to its page. -->
<template>
  <li>
    <NuxtLink
      :to="publicEventPath(event.slug)"
      class="flex items-center gap-4 border-b border-argent-200 py-4.5 text-sable-950 transition-colors hover:bg-argent-50 md:gap-7 md:px-3 md:py-6.5"
    >
      <span class="flex w-15.5 shrink-0 flex-col md:w-24">
        <span class="font-display text-kpi font-bold md:text-day">{{ parts.day }}</span>
        <span class="mt-1.25 text-overline font-semibold text-argent-600 uppercase md:mt-2 md:text-caption md:tracking-overline">
          {{ parts.month }}<span class="hidden md:inline"> · {{ parts.weekday }}</span>
        </span>
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.75 md:gap-2">
        <div class="flex flex-wrap items-center gap-2.5">
          <h3 class="text-title font-semibold md:font-display md:text-row md:font-strong">
            {{ event.title }}
          </h3>
          <span class="hidden md:inline-flex">
            <SiteCategoryPill :category="event.category" />
          </span>
        </div>
        <span class="text-sm text-argent-600 md:hidden">{{ event.venue_name }} · {{ time(event.starts_at) }}</span>
        <span class="hidden flex-wrap gap-x-5 gap-y-1.5 text-ui text-sable-600 md:flex">
          <span class="inline-flex items-center gap-1.5">
            <MapPin
              :size="16"
              aria-hidden="true"
            />
            {{ event.venue_name }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <Clock
              :size="16"
              aria-hidden="true"
            />
            {{ schedule(event) }}
          </span>
          <span v-if="event.price_label">{{ event.price_label }}</span>
        </span>
      </div>
      <ChevronRight
        :size="18"
        class="shrink-0 md:hidden"
        aria-hidden="true"
      />
      <span class="hidden size-12 shrink-0 items-center justify-center rounded-full border border-argent-250 md:inline-flex">
        <ArrowRight
          :size="18"
          aria-hidden="true"
        />
      </span>
    </NuxtLink>
  </li>
</template>
