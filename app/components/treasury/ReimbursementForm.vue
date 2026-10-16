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
const FIELD_LABELS: Readonly<Record<string, string>> = { reimbursed_on: 'Remboursée le', reimbursement_method: 'Moyen de remboursement' }

const now = useNow()
const { markReimbursed } = useTreasuryWrites()

const today = computed(() => parisDate(now.value))
const reimbursedOn = ref(today.value)
const method = ref<ReimbursementMethod>('transfer')
const errors = ref<FormErrors | null>(null)
const pending = ref(false)
const form = useTemplateRef<HTMLFormElement>('form')

async function submit(): Promise<void> {
  pending.value = true
  const result = await markReimbursed(entry.id, { reimbursed_on: reimbursedOn.value, reimbursement_method: method.value })
  pending.value = false
  if (result.errors) return refuse(placeErrors(result.errors, SHOWN, path => FIELD_LABELS[path] ?? path))
  emit('saved', result.data)
}

// The refusal takes the focus, as in every form of the board.
async function refuse(refusal: FormErrors): Promise<void> {
  errors.value = refusal
  await nextTick()
  form.value?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')?.focus()
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
        v-slot="{ id, describedby, invalid }"
        label="Remboursée le"
        class="grow basis-40"
        :errors="errors?.fields.reimbursed_on"
      >
        <UiInput
          :id
          v-model="reimbursedOn"
          type="date"
          :min="entry.date"
          :max="today"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <UiSegmentedControl
        v-model="method"
        :options="REIMBURSEMENT_METHOD_OPTIONS"
        label="Moyen de remboursement"
      />
    </div>
    <p
      v-if="errors?.form.length"
      role="alert"
      tabindex="-1"
      class="text-sm font-semibold text-ambre-800"
    >
      {{ errors.form.join(' ') }}
    </p>
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
