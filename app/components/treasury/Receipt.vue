<script setup lang="ts">
import { Eye, Paperclip, TriangleAlert } from '@lucide/vue'
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// The receipt of a line, on its page: opened above the page, or joined from a
// file; when it is missing, the member to ask, and the sworn statement of a
// ticket lost (D14), which the invoice's « Ligne déjà saisie » attaches.
const { entry } = defineProps<{ entry: LedgerEntryOut }>()

const emit = defineEmits<{ changed: [entry: LedgerEntryOut] }>()

const { attachReceipt } = useTreasuryWrites()

const picker = useTemplateRef<HTMLInputElement>('picker')
const viewing = ref(false)
const pending = ref(false)
const failure = ref<string | null>(null)

const statement = computed(() => statementLocation(entry.event?.id ?? null))

async function picked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // The same file chosen again is a new choice.
  input.value = ''
  if (!file) return
  pending.value = true
  const result = await attachReceipt(entry.id, file)
  pending.value = false
  if (result.errors) {
    failure.value = refusalText(result.errors)
    return
  }
  failure.value = null
  emit('changed', result.data)
}
</script>

<template>
  <UiCard title="Justificatif">
    <div
      v-if="entry.receipt"
      class="flex items-center gap-3.5"
    >
      <DocumentsThumbnail />
      <div class="flex min-w-0 flex-col gap-2">
        <span class="truncate text-ui font-medium">{{ entry.receipt.title }}</span>
        <div class="flex flex-wrap items-center gap-3">
          <UiButton
            variant="secondary"
            size="sm"
            aria-haspopup="dialog"
            @click="viewing = true"
          >
            <Eye :size="16" />
            Ouvrir le justificatif
          </UiButton>
          <UiButton
            variant="link"
            :to="documentLocation(entry.receipt.id)"
          >
            Voir parmi les documents
          </UiButton>
        </div>
      </div>
      <DocumentsViewer
        v-model:open="viewing"
        :document="entry.receipt"
      />
    </div>
    <UiCallout
      v-else-if="entry.receipt_state === 'missing'"
      tone="ambre"
      title="Justificatif manquant"
      :icon="TriangleAlert"
    >
      <p>Ticket perdu ? Faites une attestation sur l’honneur, puis rattachez-la à cette ligne en la marquant payée.</p>
      <template #actions>
        <UiButton
          variant="secondary"
          size="sm"
          :loading="pending"
          @click="picker?.click()"
        >
          <Paperclip :size="16" />
          Joindre le justificatif
        </UiButton>
        <TreasuryFollowUp :entry />
        <UiButton
          variant="link"
          :to="statement"
        >
          Faire une attestation
        </UiButton>
      </template>
    </UiCallout>
    <div
      v-else
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-argent-600">
        Aucun justificatif n’est demandé pour cette ligne.
      </p>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="pending"
        @click="picker?.click()"
      >
        <Paperclip :size="16" />
        Joindre un document
      </UiButton>
    </div>
    <input
      ref="picker"
      type="file"
      class="sr-only"
      tabindex="-1"
      aria-label="Justificatif"
      :accept="DOCUMENT_TYPES"
      @change="picked"
    >
    <p
      v-if="failure"
      role="alert"
      class="text-sm font-semibold text-ambre-800"
    >
      {{ failure }}
    </p>
  </UiCard>
</template>
