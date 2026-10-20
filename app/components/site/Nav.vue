<script setup lang="ts">
const { stacked = false } = defineProps<{
  /** One link under another, as in the menu of a phone. */
  stacked?: boolean
}>()

// The sections of the home page. The pages of the events belong to the agenda,
// whose link stays lit there. The router would mark each link as the current
// page on the home page, whatever its anchor: the links decide alone.
const LINKS = [
  { label: 'Agenda', to: AGENDA_PATH },
  { label: 'Le comité', to: '/#comite' },
  { label: 'Contact', to: '/#contact' },
] as const

const route = useRoute()
const links = computed(() =>
  LINKS.map(link => ({ ...link, current: link.to === AGENDA_PATH && route.path.startsWith('/evenements/') })),
)

const classes = {
  list: {
    row: 'flex items-center gap-1',
    stacked: 'flex flex-col gap-1',
  },
  link: {
    row: 'rounded-full px-3.5 py-2 text-body font-medium',
    stacked: 'flex h-12 items-center rounded-field px-4 text-base font-medium',
  },
  current: 'bg-argent-100',
}

const layout = computed(() => (stacked ? 'stacked' : 'row'))
</script>

<template>
  <nav aria-label="Navigation principale">
    <ul :class="classes.list[layout]">
      <li
        v-for="link in links"
        :key="link.to"
      >
        <NuxtLink
          :to="link.to"
          :aria-current="link.current ? 'true' : undefined"
          class="text-sable-950 transition-colors hover:bg-argent-100"
          :class="[classes.link[layout], link.current && classes.current]"
        >
          {{ link.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
