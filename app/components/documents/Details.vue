<script setup lang="ts">
import type { components } from '~/types/api'

type DocumentOut = components['schemas']['DocumentOut']

// What a document tells, by its category, as the mockup lays it out: the rows
// of an invoice or an order, the abstract, decisions and tasks of minutes, the
// abstract and key date of any other paper. A field another category fills,
// set all the same (a document taken over from the v1), shows as a row too.
const { document } = defineProps<{ document: DocumentOut }>()

const { amount } = useMoneyFormat()
const { calendarDay } = useDateFormat()
const now = useNow()
const { data: members } = useBoardMembers()

interface Row {
  label: string
  value: string
  mono?: boolean
}

const extracted = computed(() => document.extracted)
const tasks = computed(() => extracted.value.tasks)
const decisions = computed(() => extracted.value.decisions)

function date(value: string | null | undefined): string {
  return value ? calendarDay(value, now.value) : '—'
}

const event = computed(() => document.event?.title ?? NO_EVENT_LABEL)

// The due date of an invoice gives way to the day it was paid.
const due = computed(() => (document.paid_on ? `Payée le ${date(document.paid_on)}` : date(document.due_date)))

// The rows of each category, as the mockup lays them out.
const ROWS: Readonly<Record<DocumentOut['category'], () => Row[]>> = {
  invoice: () => [
    { label: 'Fournisseur', value: document.issuer || '—' },
    { label: 'N° de facture', value: document.reference || '—', mono: true },
    { label: 'Date', value: date(document.document_date) },
    { label: 'Échéance', value: due.value },
    { label: 'Événement', value: event.value },
  ],
  order: () => [
    { label: 'Fournisseur', value: document.issuer || '—' },
    { label: 'Commandé le', value: date(document.document_date) },
    { label: 'Livraison prévue', value: date(extracted.value.delivery_date) },
    { label: 'Événement', value: event.value },
    ...extra({ reference: true }),
  ],
  minutes: () => [
    { label: 'Date', value: date(document.document_date) },
    { label: 'Événement', value: event.value },
    ...extra({ issuer: true }),
  ],
  misc: () => [
    { label: 'Date repérée', value: extracted.value.key_date || '—' },
    { label: 'Événement', value: event.value },
    ...(document.document_date ? [{ label: 'Date', value: date(document.document_date) }] : []),
    ...extra({ issuer: true, reference: true }),
  ],
}

// The fields of another category, shown only when they are set.
function extra({ issuer = false, reference = false }: { issuer?: boolean, reference?: boolean }): Row[] {
  return [
    ...(issuer && document.issuer ? [{ label: 'Émetteur', value: document.issuer }] : []),
    ...(reference && document.reference ? [{ label: 'Numéro', value: document.reference, mono: true }] : []),
  ]
}

const rows = computed(() => ROWS[document.category]())

// The amount closes an invoice and an order, and shows on any document that has one.
const amountShown = computed(() => document.category === 'invoice' || document.category === 'order' || document.amount !== null)
const amountLabel = computed(() => (document.category === 'invoice' ? 'Montant TTC' : 'Montant'))

const tasksTitle = computed(() => {
  const count = tasks.value.length
  return document.status === 'validated' ? `Tâches créées (${count})` : `Tâches à créer (${count})`
})

function assigneeName(id: number | null): string {
  if (id === null) return ''
  const member = members.value?.items.find(item => item.id === id)
  return member ? memberFirstName(member) : 'Ancien membre'
}
</script>

<template>
  <div class="flex flex-col gap-4.5">
    <div
      v-if="document.category === 'minutes' || document.category === 'misc'"
      class="flex flex-col gap-1.5"
    >
      <h3 class="text-caption font-semibold tracking-eyebrow text-argent-600 uppercase">
        Résumé
      </h3>
      <p class="text-ui whitespace-pre-line text-sable-800">
        {{ extracted.abstract || '—' }}
      </p>
    </div>
    <div
      v-if="document.category === 'minutes'"
      class="flex flex-col gap-2"
    >
      <h3 class="text-caption font-semibold tracking-eyebrow text-argent-600 uppercase">
        Décisions
      </h3>
      <ul
        v-if="decisions.length > 0"
        class="flex flex-col gap-2"
      >
        <li
          v-for="decision in decisions"
          :key="decision"
          class="flex gap-2.5 text-ui text-sable-800"
        >
          <span
            class="mt-2 size-1.5 shrink-0 rounded-full bg-sable-950"
            aria-hidden="true"
          />
          {{ decision }}
        </li>
      </ul>
      <p
        v-else
        class="text-ui text-argent-600"
      >
        —
      </p>
    </div>
    <div
      v-if="document.category === 'minutes' && tasks.length > 0"
      class="flex flex-col gap-2"
    >
      <h3 class="text-caption font-semibold tracking-eyebrow text-argent-600 uppercase">
        {{ tasksTitle }}
      </h3>
      <ul class="flex flex-col gap-2">
        <li
          v-for="(task, index) in tasks"
          :key="index"
          class="flex items-center gap-2.5 rounded-field bg-argent-50 px-3 py-2.5 text-sm"
        >
          <span
            class="size-4 shrink-0 rounded-sm border-2 border-argent-400"
            aria-hidden="true"
          />
          <span class="flex-1">{{ task.title }}</span>
          <span class="text-label text-argent-600">{{ assigneeName(task.assignee) }}</span>
        </li>
      </ul>
    </div>
    <dl class="flex flex-col">
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex justify-between gap-4 border-b border-argent-100 py-2.5 text-ui"
      >
        <dt class="text-argent-600">
          {{ row.label }}
        </dt>
        <dd
          class="text-right"
          :class="row.mono ? 'font-mono text-note' : 'font-medium'"
        >
          {{ row.value }}
        </dd>
      </div>
      <div
        v-if="document.category === 'order'"
        class="flex flex-col gap-1 border-b border-argent-100 py-2.5 text-ui"
      >
        <dt class="text-argent-600">
          Articles
        </dt>
        <dd class="whitespace-pre-line">
          {{ extracted.items || '—' }}
        </dd>
      </div>
      <div
        v-if="amountShown"
        class="flex items-baseline justify-between gap-4 pt-3.5 pb-1"
      >
        <dt class="text-ui text-argent-600">
          {{ amountLabel }}
        </dt>
        <dd class="font-mono text-3xl font-semibold tracking-tight">
          {{ amount(document.amount) }}
        </dd>
      </div>
    </dl>
    <div
      v-if="document.note"
      class="flex flex-col gap-1.5"
    >
      <h3 class="text-caption font-semibold tracking-eyebrow text-argent-600 uppercase">
        Remarque
      </h3>
      <p class="text-ui whitespace-pre-line text-sable-800">
        {{ document.note }}
      </p>
    </div>
  </div>
</template>
