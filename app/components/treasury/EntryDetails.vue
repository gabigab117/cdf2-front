<script setup lang="ts">
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// What a line of the journal tells, as its page shows it.
const { entry } = defineProps<{ entry: LedgerEntryOut }>()

const { calendarLong, recordedAt } = useDateFormat()

const rows = computed(() => [
  { label: 'Date', value: calendarLong(entry.date) },
  { label: 'Type', value: KIND_LABELS[entry.kind] },
  { label: 'Catégorie', value: CATEGORY_LABELS[entry.category] },
  { label: 'Paiement', value: paymentText(entry) },
  { label: 'Événement', value: entry.event?.title ?? GENERAL_LABEL },
  { label: 'Fournisseur', value: entry.supplier || '—' },
  {
    label: 'Saisie',
    value: `${memberSignature(entry.created_by)}, le ${recordedAt(entry.created_at)}`,
  },
])
</script>

<template>
  <div class="flex flex-col gap-4.5">
    <dl class="flex flex-col">
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex justify-between gap-4 border-b border-argent-100 py-2.5 text-ui"
      >
        <dt class="text-argent-600">
          {{ row.label }}
        </dt>
        <dd class="text-right font-medium">
          {{ row.value }}
        </dd>
      </div>
    </dl>
    <div
      v-if="entry.note"
      class="flex flex-col gap-1.5"
    >
      <h3 class="text-caption font-semibold tracking-eyebrow text-argent-600 uppercase">
        Note
      </h3>
      <p class="text-ui whitespace-pre-line text-sable-800">
        {{ entry.note }}
      </p>
    </div>
  </div>
</template>
