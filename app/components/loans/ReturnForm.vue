<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type LoanLineOut = components['schemas']['LoanLineOut']
type LoanReturnIn = components['schemas']['LoanReturnIn']

// The return of a loan (A17): each line came back whole, damaged or missing,
// and how many pieces when it counts several. What is damaged will go under
// repair; what is missing is to be told to the borrower.
const { lines, save } = defineProps<{
  lines: readonly LoanLineOut[]
  /** Sends the return: the errors to show, or null once it is recorded. */
  save: (payload: LoanReturnIn) => Promise<FormErrors | null>
}>()

type Condition = 'complete' | 'damaged' | 'missing'

const CONDITIONS = [
  { value: 'complete' as const, label: 'Complet' },
  { value: 'damaged' as const, label: 'Abîmé' },
  { value: 'missing' as const, label: 'Manquant' },
]

const counted = ref(
  Object.fromEntries(lines.map(line => [line.id, { condition: 'complete' as Condition, pieces: 1 }])),
)
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const rows = computed(() =>
  lines.map((line) => {
    const back = counted.value[line.id]!
    return {
      id: line.id,
      name: line.equipment.name,
      quantity: line.quantity,
      back,
      // A line of several pieces says how many came back so.
      counts: line.quantity > 1 && back.condition !== 'complete',
      errors: [
        ...(errors.value?.fields[`lines.${lines.indexOf(line)}`] ?? []),
        ...(errors.value?.fields[`lines.${lines.indexOf(line)}.damaged_quantity`] ?? []),
        ...(errors.value?.fields[`lines.${lines.indexOf(line)}.missing_quantity`] ?? []),
      ],
    }
  }),
)

const notes = computed(() => {
  const told = rows.value
    .filter(row => row.back.condition !== 'complete')
    .map((row) => {
      const pieces = row.quantity > 1 ? row.back.pieces : 1
      return row.back.condition === 'damaged'
        ? `${row.name} : ${pieces} passera en réparation`
        : `${row.name} : ${pieces} ${pieces > 1 ? 'manquants' : 'manquant'}, à signaler à l’emprunteur`
    })
  return told.length ? `À noter : ${told.join(' ; ')}.` : null
})

function payload(): LoanReturnIn {
  return {
    lines: rows.value
      .filter(row => row.back.condition !== 'complete')
      .map((row) => {
        const pieces = row.quantity > 1 ? row.back.pieces : 1
        return {
          line: row.id,
          damaged_quantity: row.back.condition === 'damaged' ? pieces : 0,
          missing_quantity: row.back.condition === 'missing' ? pieces : 0,
        }
      }),
  }
}

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(payload())
  pending.value = false
  // A refusal of a line shows under it, the others above the button.
  const shown = new Set(lines.flatMap((_line, index) => [`lines.${index}`, `lines.${index}.damaged_quantity`, `lines.${index}.missing_quantity`]))
  errors.value = result ? placeErrors(result, shown, path => path) : null
}
</script>

<template>
  <form
    class="flex flex-col"
    @submit.prevent="submit"
  >
    <ul class="flex flex-col">
      <li
        v-for="row in rows"
        :key="row.id"
        class="flex flex-col gap-2 border-b border-argent-100 py-3"
      >
        <span class="flex justify-between gap-2.5 text-ui">
          <span class="font-medium">{{ row.name }}</span>
          <span class="font-mono font-semibold">× {{ row.quantity }}</span>
        </span>
        <UiSegmentedControl
          v-model="row.back.condition"
          :options="CONDITIONS"
          :label="`État au retour — ${row.name}`"
        />
        <span
          v-if="row.counts"
          class="flex items-center justify-between gap-3 text-note text-sable-600"
        >
          Combien ?
          <UiStepper
            v-model="row.back.pieces"
            class="w-33"
            :label="`pièces ${row.back.condition === 'damaged' ? 'abîmées' : 'manquantes'} — ${row.name}`"
            :min="1"
            :max="row.quantity"
          />
        </span>
        <span
          v-for="message in row.errors"
          :key="message"
          role="alert"
          class="text-note font-semibold text-ambre-800"
        >{{ message }}</span>
      </li>
    </ul>
    <div class="flex flex-col gap-2.5 pt-4">
      <p
        v-if="notes"
        class="rounded-field bg-ambre-50 px-3 py-2.5 text-note text-ambre-900"
      >
        {{ notes }}
      </p>
      <p
        v-for="message in errors?.form"
        :key="message"
        role="alert"
        class="text-sm font-semibold text-ambre-800"
      >
        {{ message }}
      </p>
      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :loading="pending"
      >
        <Check :size="17" />
        Valider le retour
      </UiButton>
    </div>
  </form>
</template>
