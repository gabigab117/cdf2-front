<script setup lang="ts">
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// The lines of the journal: each leads to its page.
const { entries, highlighted = null } = defineProps<{
  entries: readonly LedgerEntryOut[]
  /** The line just recorded, shown in azur as in the mockup. */
  highlighted?: number | null
}>()

const { calendarDay } = useDateFormat()
const now = useNow()

const COLUMNS = 'grid-cols-ledger-narrow md:grid-cols-ledger'
</script>

<template>
  <div>
    <div
      class="grid items-center gap-3 border-b border-argent-100 bg-argent-25 px-5.5 py-2.5 text-xs font-semibold tracking-table text-argent-600 uppercase"
      :class="COLUMNS"
      aria-hidden="true"
    >
      <span>Date</span>
      <span>Libellé</span>
      <span class="max-md:hidden">Événement</span>
      <span class="max-md:hidden">Paiement</span>
      <span class="text-right">Montant</span>
    </div>
    <ul class="divide-y divide-argent-100">
      <li
        v-for="entry in entries"
        :key="entry.id"
      >
        <UiSelectableRow
          :selected="false"
          :to="entryPath(entry.id)"
        >
          <span
            class="grid items-center gap-3 px-5.5 py-3 text-sm"
            :class="[COLUMNS, { 'bg-azur-50': entry.id === highlighted }]"
          >
            <span class="text-argent-600">{{ calendarDay(entry.date, now) }}</span>
            <span class="flex min-w-0 flex-col leading-snug">
              <span class="truncate font-medium text-sable-950">{{ entry.label }}</span>
              <span class="text-caption text-argent-600">{{ CATEGORY_LABELS[entry.category] }}</span>
            </span>
            <span class="min-w-0 max-md:hidden">
              <span
                v-if="entry.event"
                class="inline-block h-6.5 max-w-full truncate rounded-full bg-azur-100 px-2.5 text-caption leading-6.5 font-semibold text-azur-700"
              >{{ entry.event.title }}</span>
              <span
                v-else
                class="text-label text-argent-600"
              >{{ GENERAL_LABEL }}</span>
            </span>
            <span class="truncate text-note text-sable-600 max-md:hidden">{{ paymentText(entry) }}</span>
            <TreasuryAmount
              class="text-right"
              :entry
            />
          </span>
        </UiSelectableRow>
      </li>
    </ul>
  </div>
</template>
