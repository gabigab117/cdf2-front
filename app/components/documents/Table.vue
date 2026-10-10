<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type DocumentItemOut = components['schemas']['DocumentItemOut']

// The rows of the documents: each leads to its panel, the one shown selected.
const { documents, selected = null, location, eventColumn = true } = defineProps<{
  documents: readonly DocumentItemOut[]
  /** The document whose panel is open. */
  selected?: number | null
  /** The address of a document's panel, the list's own query kept. */
  location: (id: number) => RouteLocationRaw
  /** The event of each document: left out on an event's own tab. */
  eventColumn?: boolean
}>()

const { amount } = useMoneyFormat()
const { calendarDay } = useDateFormat()
const now = useNow()

const columns = computed(() => (eventColumn ? 'grid-cols-documents-narrow md:grid-cols-documents' : 'grid-cols-documents-narrow md:grid-cols-documents-event'))
</script>

<template>
  <div>
    <div
      class="grid items-center gap-3.5 border-b border-argent-100 bg-argent-25 px-4 py-2.5 text-caption font-semibold tracking-table text-argent-600 uppercase"
      :class="columns"
      aria-hidden="true"
    >
      <span />
      <span>Document</span>
      <span
        v-if="eventColumn"
        class="max-md:hidden"
      >Événement</span>
      <span class="text-right">Montant</span>
      <span class="text-right max-md:hidden">Date</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="document in documents"
        :key="document.id"
      >
        <UiSelectableRow
          :selected="document.id === selected"
          :to="location(document.id)"
        >
          <span
            class="grid items-center gap-3.5 px-4 py-3"
            :class="columns"
          >
            <DocumentsCategoryIcon :category="document.category" />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate text-ui font-semibold text-sable-950">{{ document.title }}</span>
              <span class="flex min-w-0 items-center gap-2 text-label text-argent-600">
                <span>{{ DOCUMENT_CATEGORIES[document.category].label }}</span>
                <span
                  v-if="document.status === 'to_review'"
                  class="inline-flex items-center gap-1.5 font-medium text-azur-600"
                >
                  <span
                    class="size-1.5 rounded-full bg-azur-600"
                    aria-hidden="true"
                  />
                  À vérifier
                </span>
                <span class="md:hidden">· {{ calendarDay(document.date, now) }}</span>
              </span>
            </span>
            <span
              v-if="eventColumn"
              class="truncate text-sm text-sable-600 max-md:hidden"
            >{{ document.event?.title ?? NO_EVENT_LABEL }}</span>
            <span class="text-right font-mono text-sm font-medium text-sable-950">{{ amount(document.amount) }}</span>
            <span class="text-right text-note text-argent-600 max-md:hidden">{{ calendarDay(document.date, now) }}</span>
          </span>
        </UiSelectableRow>
      </li>
    </ul>
  </div>
</template>
