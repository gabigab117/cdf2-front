<script setup lang="ts">
definePageMeta({ public: true })

const route = useRoute()
const query = computed(() => parseAgendaQuery(route.query))

// The readings of the API leave together.
const [{ data: overview }, { data: events, error }, { data: spotlight }, { data: memories, error: memoriesError }] = await Promise.all([
  useAgendaOverview(),
  useAgendaEvents(query),
  useSpotlight(),
  useMemories(),
])

// The page answers even when the API does not: the agenda and « Souvenirs » say so.
const failed = computed(() => error.value !== undefined)
const memoriesFailed = computed(() => memoriesError.value !== undefined)

useSitePage({
  title: 'Accueil',
  description: `Les fêtes du village, organisées par ses bénévoles : l’agenda des manifestations du ${SITE_NAME}, leurs infos pratiques et les photos des éditions passées.`,
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
    <SiteMemories
      :albums="memories"
      :failed="memoriesFailed"
    />
    <SiteVolunteerCall />
    <SiteContact />
  </div>
</template>
