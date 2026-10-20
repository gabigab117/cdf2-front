<script setup lang="ts">
definePageMeta({ path: '/bureau/taches' })

useHead({ title: 'Tâches générales' })

const BREADCRUMB = [{ label: 'Tableau de bord', to: BOARD_HOME_PATH }, { label: 'Tâches générales' }]

// The tasks without an event (D10): those of minutes of no event, those
// created so from « Nouveau → Tâche », by page.
const route = useRoute()
const page = computed(() => queryPage(route.query.page))

const { data, pending: loading, error, refresh } = useGeneralTasks(() => page.value)

const tasks = computed(() => data.value?.items ?? [])
const count = computed(() => data.value?.count ?? 0)

function pageLocation(target: number) {
  return { query: { page: pageParam(target) } }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBreadcrumb :items="BREADCRUMB" />
    <BoardPageTitle>Tâches générales</BoardPageTitle>
    <TasksList
      :tasks
      :count
      :page
      :loading
      :error
      :event="null"
      :page-location="pageLocation"
      empty="Aucune tâche générale."
      @changed="refresh()"
      @retry="refresh()"
    />
  </div>
</template>
