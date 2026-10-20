<script setup lang="ts">
import { Paperclip, Plus, X } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { EntryFields } from '~/utils/treasury'

type BoardMemberOut = components['schemas']['BoardMemberOut']
type LedgerEntryKind = components['schemas']['LedgerEntryKind']

// A line of the journal, as the « Nouvelle ligne » card records it and the page
// of a line corrects it.
const { title, initial, save, advancer = null, full = false, submitLabel, clearsAfterSave = false, cancelable = false, attachable = false } = defineProps<{
  title: string
  initial: EntryFields
  /** Sends the line, and the file of its receipt if any: the errors to show, or null once it is saved. */
  save: (fields: EntryFields, receipt: File | null) => Promise<FormErrors | null>
  /** Who advanced the line being corrected, a member who may have left the board since. */
  advancer?: BoardMemberOut | null
  /** The supplier and the note too, which the card of a new line leaves out. */
  full?: boolean
  /** By default, « Ajouter la dépense » or « Ajouter la recette ». */
  submitLabel?: string
  /** A line recorded, its label and amount empty for the next one, as in the mockup. */
  clearsAfterSave?: boolean
  /** « Annuler » beside the button, for a correction. */
  cancelable?: boolean
  /** « Joindre le justificatif »: a file sent with the line, filed among the documents. */
  attachable?: boolean
}>()

const emit = defineEmits<{ cancel: [] }>()

const KIND_OPTIONS: ReadonlyArray<{ value: LedgerEntryKind, label: string, tone?: 'azur' }> = [
  { value: 'expense', label: 'Dépense' },
  { value: 'income', label: 'Recette', tone: 'azur' },
]

// The mockup's own words, before anything is sent: the API checks the rest.
const INCOMPLETE = 'Indiquez un libellé et un montant supérieur à zéro.'

const session = useSessionStore()
const eventOptions = useEventChoices('Aucun — hors événement')
const { data: eventList } = useEventList()
const { data: members } = useBoardMembers()

const titleId = useId()
const form = useTemplateRef<HTMLFormElement>('form')
const picker = useTemplateRef<HTMLInputElement>('picker')
const fields = ref<EntryFields>({ ...initial })
// A file is kept as it is: nothing in it is to be watched.
const receipt = shallowRef<File | null>(null)
const errors = ref<FormErrors | null>(null)
const pending = ref(false)
const shown = computed<ReadonlySet<string>>(() => new Set([
  'date', 'kind', 'label', 'amount', 'category', 'payment_method', 'advanced_by', 'event',
  ...(full ? ['supplier', 'note'] : []),
]))

const kind = computed({
  get: () => fields.value.kind,
  set: (value) => { fields.value = withKind(fields.value, value) },
})
const isExpense = computed(() => fields.value.kind === 'expense')
const advance = computed(() => fields.value.paymentMethod === 'advance')
const today = useToday()
const categories = computed(() => categoryOptions(fields.value.kind))
const paymentMethods = computed(() => paymentMethodOptions(fields.value.kind))
const eventTitle = computed(() => eventList.value?.items.find(event => event.id === fields.value.event)?.title)
const eventHint = computed(() => (eventTitle.value
  ? `Comptera dans le résultat de « ${eventTitle.value} ».`
  : 'Ligne de fonctionnement général du comité.'))
// The board, and whoever advanced the line if they have left it since.
const advancers = computed(() => boardMemberOptions(members.value?.items ?? [], advancer))
// What the amount does to the treasury: « − » takes out, « + » brings in.
const sign = computed(() => (isExpense.value ? { text: '−', classes: 'text-sable-950' } : { text: '+', classes: 'text-azur-700' }))
const addLabel = computed(() => submitLabel ?? (isExpense.value ? 'Ajouter la dépense' : 'Ajouter la recette'))

// An advance names a member: the one signed in, until another is chosen.
watch(advance, (isAdvance) => {
  if (isAdvance && fields.value.advancedBy === null) fields.value.advancedBy = session.member?.id ?? null
})

async function submit(): Promise<void> {
  if (!isEntryComplete(fields.value)) return refuse({ form: [INCOMPLETE], fields: {} })
  pending.value = true
  const result = await save(fields.value, receipt.value)
  pending.value = false
  if (result) return refuse(placeErrors(result, shown.value, entryFieldLabel))
  errors.value = null
  if (!clearsAfterSave) return
  fields.value = { ...fields.value, label: '', amount: '' }
  receipt.value = null
}

function picked(event: Event): void {
  receipt.value = chosenFile(event)
}

// The refusal takes the focus, as in every form of the board.
async function refuse(refusal: FormErrors): Promise<void> {
  errors.value = refusal
  await focusErrors(form)
}
</script>

<template>
  <section
    :aria-labelledby="titleId"
    class="rounded-card border border-argent-200 bg-white shadow-composer"
  >
    <form
      ref="form"
      novalidate
      @submit.prevent="submit"
    >
      <header class="flex flex-wrap items-center gap-3.5 border-b border-argent-100 px-5.5 py-4.5">
        <h2
          :id="titleId"
          class="text-title font-semibold"
        >
          {{ title }}
        </h2>
        <UiSegmentedControl
          v-model="kind"
          :options="KIND_OPTIONS"
          label="Type de ligne"
        />
      </header>
      <div class="flex flex-col gap-4 p-5.5">
        <div class="flex flex-wrap gap-3.5">
          <UiField
            v-slot="{ control }"
            label="Libellé"
            class="grow-3 basis-75"
            :errors="errors?.fields.label"
          >
            <UiInput
              v-bind="control"
              v-model="fields.label"
              :placeholder="isExpense ? 'Ex. Courses buvette' : 'Ex. Recette buvette'"
            />
          </UiField>
          <UiField
            v-slot="{ id, describedby, invalid }"
            label="Montant"
            class="grow basis-40"
            :errors="errors?.fields.amount"
          >
            <span
              class="flex h-11.5 items-center gap-1.5 rounded-field border bg-white px-3.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-azur-600"
              :class="invalid ? 'border-ambre-300' : 'border-argent-250'"
            >
              <span
                class="font-mono font-semibold"
                :class="sign.classes"
                aria-hidden="true"
              >{{ sign.text }}</span>
              <input
                :id
                v-model="fields.amount"
                inputmode="decimal"
                placeholder="0,00"
                class="min-w-0 flex-1 bg-transparent text-right font-mono text-body text-sable-950 placeholder:text-argent-500 focus-visible:outline-none"
                :aria-describedby="describedby"
                :aria-invalid="invalid || undefined"
              >
              <span
                class="text-argent-600"
                aria-hidden="true"
              >€</span>
            </span>
          </UiField>
          <UiField
            v-slot="{ control }"
            label="Date"
            class="grow basis-40"
            :errors="errors?.fields.date"
          >
            <UiInput
              v-bind="control"
              v-model="fields.date"
              type="date"
              :max="today"
              required
            />
          </UiField>
        </div>
        <div class="flex flex-wrap gap-3.5">
          <UiField
            v-slot="{ control }"
            label="Catégorie"
            class="grow basis-50"
            :errors="errors?.fields.category"
          >
            <UiSelect
              v-bind="control"
              v-model="fields.category"
              :options="categories"
            />
          </UiField>
          <UiField
            v-slot="{ control }"
            label="Moyen de paiement"
            class="grow basis-50"
            :errors="errors?.fields.payment_method"
          >
            <UiSelect
              v-bind="control"
              v-model="fields.paymentMethod"
              :options="paymentMethods"
            />
          </UiField>
          <UiField
            v-slot="{ control }"
            label="Événement"
            optional
            :help="eventHint"
            class="grow basis-60"
            :errors="errors?.fields.event"
          >
            <UiSelect
              v-bind="control"
              v-model="fields.event"
              :options="eventOptions"
              :highlighted="fields.event !== null"
            />
          </UiField>
        </div>
        <UiField
          v-if="advance"
          v-slot="{ control }"
          label="Avancé par"
          class="sm:max-w-80"
          :errors="errors?.fields.advanced_by"
        >
          <UiSelect
            v-bind="control"
            v-model="fields.advancedBy"
            :options="advancers"
            placeholder="Choisir un membre"
          />
        </UiField>
        <div
          v-if="full"
          class="flex flex-wrap gap-3.5"
        >
          <UiField
            v-slot="{ control }"
            label="Fournisseur"
            optional
            class="grow basis-60"
            :errors="errors?.fields.supplier"
          >
            <UiInput
              v-bind="control"
              v-model="fields.supplier"
            />
          </UiField>
          <UiField
            v-slot="{ control }"
            label="Note"
            optional
            class="grow-3 basis-75"
            :errors="errors?.fields.note"
          >
            <UiInput
              v-bind="control"
              v-model="fields.note"
            />
          </UiField>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div class="flex flex-col items-start gap-2.5">
            <div
              v-if="errors?.form.length"
              role="alert"
              tabindex="-1"
              class="flex items-start gap-2 text-sm text-ambre-800"
            >
              <UiErrorMark />
              <span class="flex flex-col">
                <span
                  v-for="message in errors.form"
                  :key="message"
                >{{ message }}</span>
              </span>
            </div>
            <template v-if="attachable">
              <span
                v-if="receipt"
                class="inline-flex h-10 max-w-full items-center gap-2 rounded-control border border-argent-250 bg-argent-25 pr-1 pl-3 text-sm text-sable-800"
              >
                <Paperclip
                  :size="16"
                  class="shrink-0 text-azur-600"
                />
                <span class="truncate">{{ receipt.name }}</span>
                <UiIconButton
                  size="sm"
                  label="Retirer le justificatif"
                  @click="receipt = null"
                >
                  <X :size="16" />
                </UiIconButton>
              </span>
              <UiButton
                v-else
                variant="dashed"
                size="sm"
                @click="picker?.click()"
              >
                <Paperclip :size="16" />
                Joindre le justificatif
              </UiButton>
              <input
                ref="picker"
                type="file"
                class="sr-only"
                tabindex="-1"
                aria-label="Justificatif"
                :accept="DOCUMENT_TYPES"
                @change="picked"
              >
            </template>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UiButton
              v-if="cancelable"
              variant="secondary"
              @click="emit('cancel')"
            >
              Annuler
            </UiButton>
            <UiButton
              type="submit"
              variant="accent"
              size="lg"
              :loading="pending"
            >
              <Plus
                v-if="!submitLabel"
                :size="18"
              />
              {{ addLabel }}
            </UiButton>
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
