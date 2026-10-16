<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { EntryFields } from '~/utils/treasury'

definePageMeta({ path: '/bureau/tresorerie/ecritures/:id(\\d+)' })

const id = Number(useRoute().params.id)

const { data: entry, error, refresh } = useLedgerEntry(id)
// The line comes once the page shows: a line that does not exist turns it into
// the page not found.
watch(error, (failure) => {
  if (failure?.status === 404) showError({ status: 404, statusText: 'Not Found' })
})

useHead({ title: () => entry.value?.label ?? 'Ligne de trésorerie' })

const { correctEntry, deleteEntry } = useTreasuryWrites()

const editing = ref(false)
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(trigger)

// The journal of the line's fiscal year.
const journal = computed(() => ledgerLocation(TREASURY_PATH, {
  year: entry.value ? Number(entry.value.date.slice(0, 4)) : null,
  filter: null,
  page: 1,
}))
const breadcrumb = computed(() => [{ label: 'Trésorerie', to: journal.value }, { label: entry.value?.label ?? '' }])
const question = computed(() => `Supprimer la ligne « ${entry.value?.label} » ?`)

async function correct(fields: EntryFields) {
  const result = await correctEntry(id, entryPayload(fields))
  if (result.errors) return result.errors
  entry.value = result.data
  editing.value = false
  return null
}

async function remove(): Promise<void> {
  const back = journal.value
  if (await confirm(() => deleteEntry(id))) await navigateTo(back)
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <template v-if="entry">
      <UiBreadcrumb
        :items="breadcrumb"
        back
      />
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1.5">
          <BoardPageTitle>{{ entry.label }}</BoardPageTitle>
          <p class="text-lead text-argent-600">
            {{ KIND_LABELS[entry.kind] }} · {{ CATEGORY_LABELS[entry.category] }}
          </p>
        </div>
        <TreasuryAmount
          class="text-headline"
          :entry
        />
      </div>
      <TreasuryEntryForm
        v-if="editing"
        title="Corriger la ligne"
        :initial="entryFields(entry)"
        :advancer="entry.advanced_by"
        :save="correct"
        full
        cancelable
        submit-label="Enregistrer"
        @cancel="editing = false"
      />
      <UiCard
        v-else
        title="Détail"
      >
        <TreasuryEntryDetails :entry />
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <UiButton
              variant="secondary"
              size="sm"
              @click="editing = true"
            >
              <Pencil
                :size="16"
                aria-hidden="true"
              />
              Corriger
            </UiButton>
            <UiButton
              ref="trigger"
              variant="secondary"
              size="sm"
              @click="ask"
            >
              <Trash2
                :size="16"
                aria-hidden="true"
              />
              Supprimer
            </UiButton>
          </div>
        </template>
      </UiCard>
      <TreasuryReceipt
        v-if="!editing"
        :entry
        @changed="entry = $event"
      />
      <UiConfirmation
        v-if="confirming"
        :question
        :pending
        :failure
        @confirm="remove"
        @cancel="dismiss"
      />
    </template>
    <BoardLoadError
      v-else-if="error && error.status !== 404"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
