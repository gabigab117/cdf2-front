<script setup lang="ts">
definePageMeta({ path: '/evenements/:slug', public: true })

const slug = String(useRoute().params.slug)
const { data: event, error } = await usePublicEvent(slug)

// A draft or an address the agenda does not know is not found. The API out of
// reach is a page to try again later.
if (!event.value) {
  throw createError(
    error.value?.status === 404
      ? { status: 404, statusText: 'Not Found', fatal: true }
      : { status: 503, statusText: 'Service Unavailable', fatal: true, data: { path: publicEventPath(slug) } },
  )
}

const { eventWhen } = useDateFormat()

const breadcrumb = computed(() => [{ label: 'Agenda', to: '/#agenda' }, { label: event.value?.title ?? '' }])

useSitePage({
  title: () => event.value?.title ?? '',
  description: () => {
    if (!event.value) return ''
    return event.value.summary || `${eventWhen(event.value, { sentence: true })} · ${event.value.venue_name}`
  },
})
</script>

<template>
  <article
    v-if="event"
    class="flex flex-col"
  >
    <header class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 md:gap-8 md:px-6 md:pt-10">
      <UiBreadcrumb
        :items="breadcrumb"
        back
      />
      <div class="flex flex-wrap items-end justify-between gap-6 md:gap-8">
        <div class="flex min-w-0 grow basis-155 flex-col gap-5.5">
          <p class="flex flex-wrap gap-2">
            <SiteCategoryPill
              :category="event.category"
              size="lg"
            />
            <UiStatusPill
              v-if="event.price_label"
              tone="outline"
              size="lg"
            >
              {{ event.price_label }}
            </UiStatusPill>
          </p>
          <h1 class="font-display text-event font-heavy">
            {{ event.title }}
          </h1>
          <p
            v-if="event.summary"
            class="max-w-160 text-intro text-pretty text-sable-600"
          >
            {{ event.summary }}
          </p>
        </div>
        <SiteDateBlock :event />
      </div>
    </header>
    <div class="mx-auto flex w-full max-w-7xl flex-wrap items-start gap-14 px-4 pt-12 pb-6 md:px-6 md:pt-16">
      <div class="flex min-w-0 grow basis-140 flex-col gap-14">
        <SiteProgramme
          v-if="event.programme.length"
          :items="event.programme"
        />
        <SitePracticalInfos
          v-if="event.practical_infos.length"
          :infos="event.practical_infos"
        />
      </div>
      <SiteEventFacts
        :event
        class="max-w-105 grow basis-85 md:sticky md:top-24"
      />
    </div>
    <SiteNextEvents
      v-if="event.next_events.length"
      :events="event.next_events"
    />
  </article>
</template>
