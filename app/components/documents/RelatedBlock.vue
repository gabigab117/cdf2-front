<script setup lang="ts">
import { FileText } from '@lucide/vue'

// The « Documents liés » block beside the notes of an event, from its
// dashboard: the latest, each with the pill of its category.
const { eventId } = defineProps<{ eventId: number }>()

const { data: dashboard, error } = useEventDashboard(eventId)

const documents = computed(() =>
  (dashboard.value?.documents ?? []).map(document => ({ ...document, look: DOCUMENT_CATEGORIES[document.category] })),
)
const count = computed(() => dashboard.value?.documents_count ?? 0)
const more = computed(() =>
  count.value > 0
    ? { label: `Voir les ${count.value} documents`, to: { query: eventPageQuery({ tab: 'documents', page: 1 }) } }
    : { label: 'Déposer un document', to: { path: NEW_DOCUMENT_PATH, query: { evenement: String(eventId) } } },
)
</script>

<template>
  <section
    v-if="dashboard && !error"
    class="overflow-hidden rounded-tile border border-argent-200 bg-white"
  >
    <header class="border-b border-argent-100 px-5 py-4.5">
      <h2 class="text-base font-semibold">
        Documents liés
      </h2>
    </header>
    <ul
      v-if="documents.length > 0"
      class="py-1.5"
    >
      <li
        v-for="document in documents"
        :key="document.id"
      >
        <NuxtLink
          :to="documentLocation(document.id)"
          class="flex items-center gap-3 px-5 py-2.5 text-ui text-sable-950 transition-colors hover:bg-argent-25"
        >
          <FileText
            :size="17"
            aria-hidden="true"
            class="shrink-0 text-argent-600"
          />
          <span class="min-w-0 flex-1 truncate">{{ document.title }}</span>
          <UiStatusPill
            :tone="document.look.tone"
            size="sm"
          >
            {{ document.look.label }}
          </UiStatusPill>
        </NuxtLink>
      </li>
    </ul>
    <p
      v-else
      class="px-5 py-4 text-sm text-argent-600"
    >
      Aucun document pour l’instant.
    </p>
    <div class="border-t border-argent-100 px-5 py-3">
      <UiButton
        variant="link"
        :to="more.to"
      >
        {{ more.label }}
      </UiButton>
    </div>
  </section>
</template>
