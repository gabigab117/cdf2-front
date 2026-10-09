<script setup lang="ts">
// The next three events, from the request the navigation's count shares. With
// none to come, the block is not shown at all.
const { data } = useUpcomingEvents()
const { dayMonth } = useDateFormat()
const route = useRoute()
const titleId = useId()

const classes = {
  dot: {
    next: 'bg-azur-400',
    later: 'bg-argent-600',
  },
}

const events = computed(() =>
  (data.value?.items ?? []).map((event, index) => {
    const path = eventPath(event.id)
    return {
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      date: dayMonth(event.starts_at),
      path,
      // The next event stands out, as in the mockup.
      dot: index === 0 ? classes.dot.next : classes.dot.later,
      // Its page, and the pages below it.
      current: route.path === path || route.path.startsWith(`${path}/`),
    }
  }),
)
</script>

<template>
  <nav
    v-if="events.length > 0"
    :aria-labelledby="titleId"
    class="flex flex-col gap-0.5"
  >
    <span
      :id="titleId"
      class="px-3 pb-2 text-overline font-semibold text-argent-450 uppercase"
    >À venir</span>
    <NuxtLink
      v-for="event in events"
      :key="event.id"
      :to="event.path"
      :aria-current="event.current ? 'page' : undefined"
      class="flex h-9 items-center gap-2.5 rounded-control px-3 text-sm text-argent-350 transition-colors hover:bg-sable-850 hover:text-white current:bg-sable-850 current:text-white"
    >
      <span
        aria-hidden="true"
        class="size-2 shrink-0 rounded-full"
        :class="event.dot"
      />
      <span class="min-w-0 flex-1 truncate">{{ event.title }}</span>
      <time
        :datetime="event.startsAt"
        class="font-mono text-xs text-argent-450"
      >{{ event.date }}</time>
    </NuxtLink>
  </nav>
</template>
