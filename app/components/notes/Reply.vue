<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { NoteDraft } from '~/utils/notes'

type ReplyOut = components['schemas']['ReplyOut']

const { reply, leadId } = defineProps<{
  reply: ReplyOut
  /** The event's lead, whose avatar stands out. */
  leadId: number | null
}>()

const emit = defineEmits<{ changed: [] }>()

const { rewriteNote, deleteNote } = useNoteWrites()

const editing = ref(false)
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(trigger)

// A reply keeps neither tag nor pin.
function rewrite({ text }: NoteDraft): Promise<FormErrors | null> {
  return rewriteNote(reply.id, { text, tag: null, pinned: false })
}

function rewritten(): void {
  editing.value = false
  emit('changed')
}

async function remove(): Promise<void> {
  if (await confirm(() => deleteNote(reply.id))) emit('changed')
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-3">
      <NotesByline
        :author="reply.author"
        :written-at="reply.created_at"
        :lead="reply.author !== null && reply.author.id === leadId"
        size="sm"
      />
      <div
        v-if="reply.editable && !editing"
        class="flex gap-1.5"
      >
        <UiIconButton
          label="Modifier la réponse"
          size="sm"
          @click="editing = true"
        >
          <Pencil :size="16" />
        </UiIconButton>
        <UiIconButton
          ref="trigger"
          label="Supprimer la réponse"
          size="sm"
          @click="ask"
        >
          <Trash2 :size="16" />
        </UiIconButton>
      </div>
    </div>
    <NotesForm
      v-if="editing"
      label="Texte de la réponse"
      action="Enregistrer"
      :initial="{ text: reply.text, tag: null }"
      cancellable
      :save="rewrite"
      @saved="rewritten"
      @cancel="editing = false"
    />
    <p
      v-else
      class="text-ui whitespace-pre-line text-sable-800"
    >
      {{ reply.text }}
    </p>
    <UiConfirmation
      v-if="confirming"
      question="Supprimer cette réponse ?"
      :pending
      :failure
      @confirm="remove"
      @cancel="dismiss"
    />
  </div>
</template>
