<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'

const { event } = defineProps<{ event: Pick<components['schemas']['EventOut'], 'id' | 'title'> }>()

const { deleteEvent } = useEventWrites()

const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const question = computed(() => `Supprimer « ${event.title} » ?`)

async function remove(): Promise<void> {
  if (await confirm(() => deleteEvent(event.id))) await navigateTo(EVENTS_PATH, { replace: true })
}
</script>

<template>
  <div class="max-w-3xl">
    <UiConfirmation
      v-if="confirming"
      :question
      :pending
      :failure
      @confirm="remove"
      @cancel="dismiss"
    >
      <p>Son programme, son « Bon à savoir » et ses notes sont supprimés avec lui. La suppression est définitive.</p>
    </UiConfirmation>
    <UiButton
      v-else
      ref="trigger"
      variant="secondary"
      @click="ask"
    >
      <Trash2 :size="16" />
      Supprimer l’événement
    </UiButton>
  </div>
</template>
