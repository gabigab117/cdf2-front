<script setup lang="ts">
import { X } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type LoanIn = components['schemas']['LoanIn']

definePageMeta({ path: '/bureau/prets/nouveau', topBarAction: true })

useHead({ title: 'Nouveau prêt' })

const BREADCRUMB = [{ label: 'Prêts', to: LOANS_PATH }, { label: 'Nouveau prêt' }]

const route = useRoute()
const now = useNow()
const { recordLoan } = useLoanWrites()

// From the inventory, the equipment to lend; from an event, its reservation.
const equipment = queryId(route.query.materiel)
const event = queryId(route.query.evenement)

const initial = newLoanFields(parisDate(now.value))
if (equipment !== null) initial.quantities = { [equipment]: 1 }
if (event !== null) {
  initial.borrowerType = 'committee'
  initial.event = event
}

// The loan recorded opens in its panel, or its event's tab if it came from
// there; going back leads past the form.
async function record(payload: LoanIn): Promise<FormErrors | null> {
  const result = await recordLoan(payload)
  if (result.errors) return result.errors
  const next = event === null ? loanLocation(result.data.id) : { path: eventPath(event), query: { onglet: 'materiel' } }
  await navigateTo(next, { replace: true })
  return null
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <Teleport
      defer
      to="#board-top-bar-action"
    >
      <BoardTopBarButton
        variant="secondary"
        :icon="X"
        label="Annuler"
        :to="LOANS_PATH"
      />
    </Teleport>
    <UiBreadcrumb
      :items="BREADCRUMB"
      back
    />
    <BoardPageTitle>Nouveau prêt</BoardPageTitle>
    <LoansForm
      :initial
      :save="record"
    />
  </div>
</template>
