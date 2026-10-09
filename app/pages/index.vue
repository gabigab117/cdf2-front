<script setup lang="ts">
definePageMeta({ public: true })

const route = useRoute()
const query = computed(() => parseAgendaQuery(route.query))

// The three readings of the API leave together.
const [{ data: overview }, { data: events, error }, { data: spotlight }] = await Promise.all([
  useAgendaOverview(),
  useAgendaEvents(query),
  useSpotlight(),
])

// The page answers even when the API does not: only the agenda says so.
const failed = computed(() => error.value !== undefined)

useSitePage({
  title: 'Accueil',
  description: 'Les fêtes du village, organisées par ses bénévoles : l’agenda des manifestations du Comité des Fêtes d’Ons-en-Bray et leurs infos pratiques.',
})
</script>

<template>
  <div class="flex flex-col">
    <SiteHero :spotlight />
    <SiteAgenda
      :overview
      :events
      :failed
      :query
    />
    <SiteVolunteerCall />
    <SiteContact />
  </div>
</template>
