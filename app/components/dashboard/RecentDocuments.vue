<script setup lang="ts">
import { FileText } from '@lucide/vue'
import type { components } from '~/types/api'

type DocumentItemOut = components['schemas']['DocumentItemOut']

// The « Documents récents » block: the first documents of the list, each
// leading to its panel.
const { documents, loading = false } = defineProps<{
  documents: readonly DocumentItemOut[]
  /** The documents are on their way: the block says nothing of them yet. */
  loading?: boolean
}>()

const { calendarDay } = useDateFormat()
const now = useNow()

const items = computed(() =>
  documents.map(document => ({ id: document.id, title: document.title, day: calendarDay(document.date, now.value) })),
)
</script>

<template>
  <UiCard
    flush
    title="Documents récents"
  >
    <template #actions>
      <UiButton
        variant="link"
        :to="DOCUMENTS_PATH"
      >
        Ouvrir
      </UiButton>
    </template>
    <ul
      v-if="items.length > 0"
      class="py-1.5"
    >
      <li
        v-for="item in items"
        :key="item.id"
      >
        <NuxtLink
          :to="documentLocation(item.id)"
          class="flex items-center gap-3 px-5.5 py-2.75 text-sable-950 transition-colors hover:bg-argent-25"
        >
          <FileText
            :size="18"
            aria-hidden="true"
            class="shrink-0 text-argent-600"
          />
          <span class="min-w-0 flex-1 truncate text-ui">{{ item.title }}</span>
          <span class="text-caption text-argent-600">{{ item.day }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p
      v-else-if="!loading"
      class="px-5.5 py-6 text-sm text-argent-600"
    >
      Aucun document pour l’instant.
    </p>
  </UiCard>
</template>
