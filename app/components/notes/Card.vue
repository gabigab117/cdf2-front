<script setup lang="ts">
import { Pencil, Pin, PinOff, Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { NoteDraft } from '~/utils/notes'

type NoteOut = components['schemas']['NoteOut']

const { note, leadId } = defineProps<{
  note: NoteOut
  /** The event's lead, whose avatar stands out. */
  leadId: number | null
}>()

const emit = defineEmits<{ changed: [] }>()

const { rewriteNote, deleteNote } = useNoteWrites()

const editing = ref(false)
const pinning = ref(false)
const pinFailure = ref<string | null>(null)

const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const tag = computed(() => (note.tag ? NOTE_TAGS[note.tag] : null))
const byLead = computed(() => note.author !== null && note.author.id === leadId)
const repliesGone = computed(() => {
  const count = note.replies.length
  if (count === 0) return null
  return count === 1 ? 'Sa réponse est supprimée avec elle.' : `Ses ${count} réponses sont supprimées avec elle.`
})

// Rewriting keeps the pin; pinning keeps the text and the tag.
function rewrite({ text, tag }: NoteDraft): Promise<FormErrors | null> {
  return rewriteNote(note.id, { text, tag, pinned: note.pinned })
}

function rewritten(): void {
  editing.value = false
  emit('changed')
}

async function togglePin(): Promise<void> {
  pinning.value = true
  const errors = await rewriteNote(note.id, { text: note.text, tag: note.tag, pinned: !note.pinned })
  pinning.value = false
  pinFailure.value = errors ? [...errors.form, ...Object.values(errors.fields).flat()].join(' ') : null
  if (!errors) emit('changed')
}

async function remove(): Promise<void> {
  if (await confirm(() => deleteNote(note.id))) emit('changed')
}
</script>

<template>
  <article class="flex flex-col gap-3 rounded-tile border border-argent-200 bg-white px-5.5 py-5">
    <div class="flex flex-wrap items-center gap-3">
      <NotesByline
        :author="note.author"
        :written-at="note.created_at"
        :lead="byLead"
      />
      <div class="ml-auto flex items-center gap-2">
        <span
          v-if="note.pinned"
          class="inline-flex items-center gap-1.5 text-caption font-semibold text-argent-600"
        >
          <Pin
            :size="14"
            aria-hidden="true"
          />
          Épinglée
        </span>
        <UiStatusPill
          v-if="tag"
          :tone="tag.tone"
        >
          {{ tag.label }}
        </UiStatusPill>
      </div>
    </div>
    <NotesForm
      v-if="editing"
      label="Texte de la note"
      action="Enregistrer"
      :initial="{ text: note.text, tag: note.tag }"
      tagged
      cancellable
      :save="rewrite"
      @saved="rewritten"
      @cancel="editing = false"
    />
    <p
      v-else
      class="text-body whitespace-pre-line text-sable-800"
    >
      {{ note.text }}
    </p>
    <p
      v-if="pinFailure"
      role="alert"
      class="text-sm font-semibold text-ambre-800"
    >
      {{ pinFailure }}
    </p>
    <UiConfirmation
      v-if="confirming"
      question="Supprimer cette note ?"
      :pending
      :failure
      @confirm="remove"
      @cancel="dismiss"
    >
      <p v-if="repliesGone">
        {{ repliesGone }}
      </p>
    </UiConfirmation>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <NotesReplies
        class="min-w-0 flex-1"
        :note
        :lead-id
        @changed="emit('changed')"
      />
      <div
        v-if="note.editable && !editing"
        class="flex gap-1.5"
      >
        <UiIconButton
          :label="note.pinned ? 'Désépingler la note' : 'Épingler la note'"
          size="sm"
          :disabled="pinning"
          @click="togglePin"
        >
          <PinOff
            v-if="note.pinned"
            :size="16"
          />
          <Pin
            v-else
            :size="16"
          />
        </UiIconButton>
        <UiIconButton
          label="Modifier la note"
          size="sm"
          @click="editing = true"
        >
          <Pencil :size="16" />
        </UiIconButton>
        <UiIconButton
          ref="trigger"
          label="Supprimer la note"
          size="sm"
          @click="ask"
        >
          <Trash2 :size="16" />
        </UiIconButton>
      </div>
    </div>
  </article>
</template>
