<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// The reimbursement of an advance, on the page of its line (6.5): owed to its
// member and marked reimbursed in place, or paid back, which « Annuler le
// remboursement » undoes after a click too many.
const { entry } = defineProps<{ entry: LedgerEntryOut }>()

const emit = defineEmits<{ changed: [entry: LedgerEntryOut] }>()

const { cancelReimbursement } = useTreasuryWrites()
const { calendarDay } = useDateFormat()
const now = useNow()

const marking = ref(false)
// The button in place, « Marquer remboursée » or « Annuler le remboursement »:
// the focus comes back to it once the form or the question is gone.
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const owed = computed(() => entry.reimbursed_on === null)
// « Remboursée le 20 sept. par virement », or « À rembourser à Julie R. ».
const state = computed(() => {
  if (entry.reimbursed_on !== null && entry.reimbursement_method !== null) {
    return `Remboursée le ${calendarDay(entry.reimbursed_on, now.value)} ${REIMBURSED_BY[entry.reimbursement_method]}`
  }
  return `À rembourser à ${memberMention(entry.advanced_by)}`
})

async function closed(updated?: LedgerEntryOut): Promise<void> {
  marking.value = false
  if (updated) emit('changed', updated)
  await dismiss()
}

async function cancel(): Promise<void> {
  const done = await confirm(async () => {
    const result = await cancelReimbursement(entry.id)
    if (result.errors) return refusalText(result.errors)
    emit('changed', result.data)
    return null
  })
  if (done) await dismiss()
}
</script>

<template>
  <UiCard title="Remboursement">
    <p
      class="text-ui"
      :class="owed ? 'font-medium text-ambre-800' : 'text-sable-800'"
    >
      {{ state }}
    </p>
    <TreasuryReimbursementForm
      v-if="marking"
      :entry
      @saved="closed"
      @cancel="closed()"
    />
    <UiConfirmation
      v-else-if="confirming"
      question="Annuler le remboursement de cette avance ?"
      action="Annuler le remboursement"
      keep="Garder le remboursement"
      :pending
      :failure
      @confirm="cancel"
      @cancel="dismiss"
    >
      <p>Elle sera de nouveau à rembourser.</p>
    </UiConfirmation>
    <div
      v-else
      class="flex flex-wrap gap-2"
    >
      <UiButton
        v-if="owed"
        ref="trigger"
        variant="secondary"
        size="sm"
        @click="marking = true"
      >
        Marquer remboursée
      </UiButton>
      <UiButton
        v-else
        ref="trigger"
        variant="secondary"
        size="sm"
        @click="ask"
      >
        Annuler le remboursement
      </UiButton>
    </div>
  </UiCard>
</template>
