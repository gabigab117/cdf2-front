<script setup lang="ts">
import { Camera, Check, ChevronLeft } from '@lucide/vue'
import type { components } from '~/types/api'
import type { EntryFields } from '~/utils/treasury'

type LedgerPaymentMethod = components['schemas']['LedgerPaymentMethod']

definePageMeta({ path: '/bureau/tresorerie/nouvelle' })

useHead({ title: 'Nouvelle dépense' })

// An expense entered on a phone (6.4), the photo of its ticket as its receipt.
// The screen has no label: the note gives it, or else the supplier. « Mon
// argent » is an advance of the member signed in.
const PAID_WITH: ReadonlyArray<{ value: LedgerPaymentMethod, label: string }> = [
  { value: 'association_card', label: 'Carte asso' },
  { value: 'cash', label: 'Espèces' },
  { value: 'advance', label: 'Mon argent' },
]
const UNNAMED = 'Indiquez un fournisseur ou une note.'
const NO_AMOUNT = 'Indiquez un montant supérieur à zéro.'

const now = useNow()
const session = useSessionStore()
const events = useEventChoices()
const { calendarInWords } = useDateFormat()
const { recordEntry } = useTreasuryWrites()

const fields = ref<EntryFields>(newEntryFields('expense', parisDate(now.value)))
// A file is kept as it is: nothing in it is to be watched.
const photo = shallowRef<File | null>(null)
const preview = ref<string | null>(null)
const errors = ref<string[]>([])
const pending = ref(false)
const picker = useTemplateRef<HTMLInputElement>('picker')
const alert = useTemplateRef<HTMLElement>('alert')

const categories = categoryOptions('expense')
const today = computed(() => parisDate(now.value))
const eventOptions = computed(() => [{ value: null, label: 'Aucun — hors événement' }, ...events.value])
// « TTC · mercredi 30 septembre »
const day = computed(() => (fields.value.date ? `TTC · ${calendarInWords(fields.value.date, now.value, { weekday: true })}` : 'TTC'))
// The amount's field fits what it holds, « 0,00 » at least: the euro sign follows it.
const amountSize = computed(() => Math.max(fields.value.amount.length, 4))
const photoText = computed(() => (photo.value ? 'Elle sera jointe à la dépense.' : 'Elle servira de justificatif.'))
const advance = computed(() => fields.value.paymentMethod === 'advance')
const advancer = computed(() => (session.member ? memberName(session.member) : null))

function taken(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // The same photo taken again is a new choice.
  input.value = ''
  if (!file) return
  forget()
  photo.value = file
  preview.value = URL.createObjectURL(file)
}

// The preview's address is released once it is no longer shown. A photo the
// browser cannot show, as a HEIC in Chrome, leaves the camera in its place.
function forget(): void {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
}

onBeforeUnmount(forget)

async function save(): Promise<void> {
  const label = fields.value.note.trim() || fields.value.supplier.trim()
  const refusals = [
    ...(label ? [] : [UNNAMED]),
    ...(Number(amountInput(fields.value.amount)) > 0 ? [] : [NO_AMOUNT]),
  ]
  if (refusals.length > 0) return refuse(refusals)
  pending.value = true
  // The note gave the label: it is not kept twice.
  const result = await recordEntry({ ...fields.value, label, note: '', advancedBy: session.member?.id ?? null }, photo.value)
  pending.value = false
  if (result.errors) return refuse(placeErrors(result.errors, new Set(), entryFieldLabel).form)
  await navigateTo(entryPath(result.data.id))
}

// The refusal takes the focus, as in every form of the board.
async function refuse(messages: string[]): Promise<void> {
  errors.value = messages
  await nextTick()
  alert.value?.focus()
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center">
      <UiIconButton
        :to="TREASURY_PATH"
        label="Retour à la trésorerie"
        surface="plain"
      >
        <ChevronLeft
          :size="22"
          aria-hidden="true"
        />
      </UiIconButton>
      <h1 class="flex-1 text-center text-base font-semibold">
        Nouvelle dépense
      </h1>
      <span
        class="size-11 shrink-0"
        aria-hidden="true"
      />
    </div>
    <div class="flex items-center gap-3.5 rounded-tile border border-argent-200 bg-white p-3">
      <img
        v-if="preview"
        :src="preview"
        alt=""
        class="h-19.5 w-14.5 shrink-0 rounded-md object-cover shadow-float ring-1 ring-argent-200"
        @error="forget"
      >
      <span
        v-else
        class="inline-flex h-19.5 w-14.5 shrink-0 items-center justify-center rounded-md border border-dashed border-argent-300 text-argent-500"
        aria-hidden="true"
      >
        <Camera :size="22" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-ui font-semibold">Photo du ticket</span>
        <span class="text-note text-argent-600">{{ photoText }}</span>
      </div>
      <UiButton
        variant="secondary"
        @click="picker?.click()"
      >
        {{ photo ? 'Reprendre' : 'Prendre' }}
      </UiButton>
      <input
        ref="picker"
        type="file"
        accept="image/*"
        capture="environment"
        class="sr-only"
        tabindex="-1"
        aria-label="Photo du ticket"
        @change="taken"
      >
    </div>
    <div class="flex flex-col items-center gap-1 pt-3.5 pb-1.5">
      <div class="flex items-baseline font-mono text-ticket font-semibold">
        <input
          v-model="fields.amount"
          inputmode="decimal"
          placeholder="0,00"
          :size="amountSize"
          aria-label="Montant TTC"
          class="bg-transparent text-right placeholder:text-argent-300"
        >
        <span aria-hidden="true">&nbsp;€</span>
      </div>
      <span class="text-sm text-argent-600">{{ day }}</span>
    </div>
    <div class="flex flex-col overflow-hidden rounded-tile border border-argent-200 bg-white">
      <TreasuryMobileRow
        v-model="fields.supplier"
        label="Fournisseur"
        :maxlength="200"
      />
      <TreasuryMobileRow
        v-model="fields.category"
        label="Catégorie"
        :options="categories"
      />
      <TreasuryMobileRow
        v-model="fields.event"
        label="Événement"
        :options="eventOptions"
      />
      <TreasuryMobileRow
        v-model="fields.date"
        label="Date"
        type="date"
        :max="today"
      />
      <TreasuryMobileRow
        v-model="fields.note"
        label="Note"
        :maxlength="200"
      />
    </div>
    <div class="flex flex-col gap-2">
      <span class="px-1 text-label font-semibold text-sable-600">Payé avec</span>
      <UiSegmentedControl
        v-model="fields.paymentMethod"
        :options="PAID_WITH"
        label="Payé avec"
        size="lg"
        class="w-full"
      />
    </div>
    <div
      v-if="advance"
      class="flex items-center gap-3 rounded-banner bg-ambre-50 px-4 py-3.5 text-sm text-ambre-900"
    >
      <UiAvatar
        v-if="advancer"
        :name="advancer"
        tone="ambre"
      />
      <span class="flex-1">Avancé par vous. Le remboursement sera ajouté aux écritures à traiter.</span>
    </div>
    <div
      v-if="errors.length > 0"
      ref="alert"
      role="alert"
      tabindex="-1"
      class="flex items-start gap-2 px-1 text-sm text-ambre-800"
    >
      <span
        class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ambre-50 text-xs font-bold text-ambre-700"
        aria-hidden="true"
      >!</span>
      <span class="flex flex-col">
        <span
          v-for="message in errors"
          :key="message"
        >{{ message }}</span>
      </span>
    </div>
    <div class="sticky bottom-0 -mx-4 bg-linear-to-b from-argent-50/0 to-argent-50 to-30% px-4 pt-3 pb-7">
      <UiButton
        variant="accent"
        size="lg"
        block
        :loading="pending"
        @click="save"
      >
        <Check
          :size="18"
          aria-hidden="true"
        />
        Enregistrer la dépense
      </UiButton>
    </div>
  </div>
</template>
