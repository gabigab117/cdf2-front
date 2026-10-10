<script setup lang="ts">
definePageMeta({ path: '/bureau/taches' })

useHead({ title: 'Tâches générales' })

const BREADCRUMB = [{ label: 'Tableau de bord', to: BOARD_HOME_PATH }, { label: 'Tâches générales' }]

// The tasks without an event (D10): those of minutes of no event, those
// created so from « Nouveau → Tâche », by page.
const route = useRoute()
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isInteger(value) && value > 1 ? value : 1
})

const { data, status, error, refresh } = useGeneralTasks(() => page.value)

const tasks = computed(() => data.value?.items ?? [])
const count = computed(() => data.value?.count ?? 0)
const loading = computed(() => status.value === 'pending')

function pageLocation(target: number) {
  return { query: { page: target > 1 ? String(target) : undefined } }
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
