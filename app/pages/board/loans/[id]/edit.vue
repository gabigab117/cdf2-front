<script setup lang="ts">
import { X } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type LoanIn = components['schemas']['LoanIn']

definePageMeta({ path: '/bureau/prets/:id(\\d+)/modifier', topBarAction: true })

useHead({ title: 'Modifier le prêt' })

const id = Number(useRoute().params.id)

const { data: loan, error, refresh } = await useLoan(id)
if (error.value?.status === 404) showError({ status: 404, statusText: 'Not Found' })

const { changeLoan } = useLoanWrites()

const initial = computed(() => (loan.value ? loanFields(loan.value) : null))
const reference = computed(() => loan.value?.number ?? 'Réservation interne')
const breadcrumb = computed(() => [
  { label: 'Prêts', to: LOANS_PATH },
  { label: reference.value, to: loanLocation(id) },
  { label: 'Modifier' },
])

// The loan opens in its panel as saved, in place of the form.
async function change(payload: LoanIn): Promise<FormErrors | null> {
  const result = await changeLoan(id, payload)
  if (result.errors) return result.errors
  loan.value = result.data
  await navigateTo(loanLocation(id), { replace: true })
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
        :to="loanLocation(id)"
      />
    </Teleport>
    <template v-if="loan && initial">
      <UiBreadcrumb
        :items="breadcrumb"
        back
      />
      <div class="flex flex-wrap items-center gap-3.5">
        <BoardPageTitle>Modifier le prêt</BoardPageTitle>
        <UiStatusPill
          tone="neutral"
          size="lg"
        >
          {{ reference }}
        </UiStatusPill>
      </div>
      <LoansForm
        :loan
        :initial
        :save="change"
      />
    </template>
    <BoardLoadError
      v-else-if="error"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
