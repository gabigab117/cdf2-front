<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type ReimbursementMethod = components['schemas']['ReimbursementMethod']

// « Marquer remboursée » (6.5): the day the committee paid an advance back, and
// how. The line of the advance is completed: no second expense is written.
const { entry } = defineProps<{ entry: LedgerEntryOut }>()

const emit = defineEmits<{ saved: [entry: LedgerEntryOut], cancel: [] }>()

const SHOWN: ReadonlySet<string> = new Set(['reimbursed_on'])

const today = useToday()
const { markReimbursed } = useTreasuryWrites()

const reimbursedOn = ref(today.value)
const method = ref<ReimbursementMethod>('transfer')
const errors = ref<FormErrors | null>(null)
const pending = ref(false)
const form = useTemplateRef<HTMLFormElement>('form')

async function submit(): Promise<void> {
  pending.value = true
  const result = await markReimbursed(entry.id, { reimbursed_on: reimbursedOn.value, reimbursement_method: method.value })
  pending.value = false
  if (result.errors) return refuse(placeErrors(result.errors, SHOWN, entryFieldLabel))
  emit('saved', result.data)
}

// The refusal takes the focus, as in every form of the board.
async function refuse(refusal: FormErrors): Promise<void> {
  errors.value = refusal
  await focusErrors(form)
}
</script>

<template>
  <form
    ref="form"
    novalidate
    class="flex flex-col gap-3.5 rounded-field border border-argent-200 bg-argent-25 p-3.5"
    @submit.prevent="submit"
  >
    <div class="flex flex-wrap items-end gap-3">
      <UiField
        v-slot="{ control }"
        label="Remboursée le"
        class="grow basis-40"
        :errors="errors?.fields.reimbursed_on"
      >
        <UiInput
          v-bind="control"
          v-model="reimbursedOn"
          type="date"
          :min="entry.date"
          :max="today"
          required
        />
      </UiField>
      <UiSegmentedControl
        v-model="method"
        :options="REIMBURSEMENT_METHOD_OPTIONS"
        label="Moyen de remboursement"
      />
    </div>
    <UiAlertText
      v-if="errors?.form.length"
      tabindex="-1"
    >
      {{ errors.form.join(' ') }}
    </UiAlertText>
    <div class="flex flex-wrap gap-2">
      <UiButton
        type="submit"
        variant="accent"
        size="sm"
        :loading="pending"
      >
        Marquer remboursée
      </UiButton>
      <UiButton
        variant="secondary"
        size="sm"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
    </div>
  </form>
</template>
