<script setup lang="ts">
import type { components } from '~/types/api'

type LoanMovementOut = components['schemas']['LoanMovementOut']
type StatusPillTone = 'azur' | 'ambre' | 'alert' | 'slate'

// The « Matériel : sorties et retours » block: the checkouts and returns of
// the fortnight, a late one first, each leading to its loan's panel.
const { movements, loading = false } = defineProps<{
  movements: readonly LoanMovementOut[]
  /** The loans are on their way: the block says nothing of them yet. */
  loading?: boolean
}>()

const { calendarWeekday } = useDateFormat()
const now = useNow()

// A return in azur, a late one in amber; a checkout to prepare in light amber.
function tone({ kind, loan }: LoanMovementOut): StatusPillTone {
  if (kind === 'return') return loan.state === 'overdue' ? 'alert' : 'azur'
  return loan.state === 'to_prepare' ? 'ambre' : 'slate'
}

const rows = computed(() =>
  movements.map(movement => ({
    id: movement.loan.id,
    label: movement.kind === 'return' ? 'Retour' : 'Sortie',
    tone: tone(movement),
    name: movement.loan.purpose ? `${movement.loan.display_name} — ${movement.loan.purpose}` : movement.loan.display_name,
    items: [loanItems(movement.loan.lines), movement.loan.state === 'to_prepare' ? 'à préparer' : '', movement.loan.state === 'overdue' ? 'en retard' : '']
      .filter(Boolean)
      .join(' · '),
    day: calendarWeekday(movement.day, now.value),
  })),
)
</script>

<template>
  <UiCard
    flush
    title="Matériel : sorties et retours"
  >
    <template #actions>
      <UiButton
        variant="link"
        :to="NEW_LOAN_PATH"
      >
        Nouveau prêt
      </UiButton>
    </template>
    <ul
      v-if="rows.length > 0"
      class="divide-y divide-argent-100"
    >
      <li
        v-for="row in rows"
        :key="row.id"
      >
        <NuxtLink
          :to="loanLocation(row.id)"
          class="flex items-center gap-4 px-5.5 py-3.5 text-sable-950 transition-colors hover:bg-argent-25"
        >
          <UiStatusPill
            :tone="row.tone"
            class="w-20 shrink-0 justify-center"
          >
            {{ row.label }}
          </UiStatusPill>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate font-semibold">{{ row.name }}</span>
            <span class="truncate text-note text-argent-600">{{ row.items }}</span>
          </span>
          <span class="shrink-0 text-note text-sable-600">{{ row.day }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p
      v-else-if="!loading"
      class="px-5.5 py-6 text-sm text-argent-600"
    >
      Aucune sortie ni aucun retour dans les deux semaines à venir.
    </p>
  </UiCard>
</template>
