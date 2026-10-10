<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type LoanItemOut = components['schemas']['LoanItemOut']
type LoanState = components['schemas']['LoanState']

// The rows of the loans: each leads to its panel, the one shown selected, and
// names what it calls for, done in the panel.
const { loans, selected = null, location } = defineProps<{
  loans: readonly LoanItemOut[]
  selected?: number | null
  /** The address of a loan's panel, the list's own query kept. */
  location: (id: number) => RouteLocationRaw
}>()

const { calendarPeriod } = useDateFormat()
const now = useNow()

const ACTIONS: Partial<Record<LoanState, string>> = {
  to_prepare: 'Préparer la sortie',
  out: 'Enregistrer le retour',
  overdue: 'Enregistrer le retour',
  confirmed: 'Modifier',
  committee: 'Modifier',
}

// The step of a loan that comes next, in black; its return, in azur.
const classes = {
  action: 'inline-flex h-9.5 shrink-0 items-center rounded-icon border px-3.5 text-note font-medium whitespace-nowrap',
  tone: {
    next: 'border-sable-950 bg-sable-950 text-white',
    back: 'border-azur-600 bg-azur-600 text-white',
    plain: 'border-argent-250 bg-white text-sable-950',
  },
}

function actionTone(state: LoanState): keyof typeof classes.tone {
  if (state === 'to_prepare') return 'next'
  if (state === 'out' || state === 'overdue') return 'back'
  return 'plain'
}

const rows = computed(() =>
  loans.map(loan => ({
    id: loan.id,
    name: loan.purpose ? `${loan.display_name} — ${loan.purpose}` : loan.display_name,
    look: LOAN_STATES[loan.state],
    period: calendarPeriod(loan.start_date, loan.end_date, now.value),
    reference: loan.number ?? 'réservation interne',
    items: [loanItems(loan.lines), returnNotes(loan.lines)].filter(Boolean).join(' · '),
    action: ACTIONS[loan.state] ?? null,
    actionClasses: [classes.action, classes.tone[actionTone(loan.state)]],
  })),
)
</script>

<template>
  <ul
    aria-label="Prêts"
    class="divide-y divide-argent-100"
  >
    <li
      v-for="row in rows"
      :key="row.id"
    >
      <UiSelectableRow
        :selected="row.id === selected"
        :to="location(row.id)"
      >
        <span class="flex items-center gap-4 px-5.5 py-4">
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="flex flex-wrap items-center gap-2">
              <span class="text-body font-semibold text-sable-950">{{ row.name }}</span>
              <UiStatusPill :tone="row.look.tone">{{ row.look.label }}</UiStatusPill>
            </span>
            <span class="text-note text-sable-600 first-letter:uppercase">
              {{ row.period }} · <span class="font-mono text-caption text-argent-600">{{ row.reference }}</span>
            </span>
            <span class="text-label text-pretty text-argent-600">{{ row.items }}</span>
          </span>
          <span
            v-if="row.action"
            :class="row.actionClasses"
            class="max-md:hidden"
          >{{ row.action }}</span>
        </span>
      </UiSelectableRow>
    </li>
  </ul>
</template>
