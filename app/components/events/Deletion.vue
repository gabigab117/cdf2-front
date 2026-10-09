<script setup lang="ts">
import { Trash2, TriangleAlert } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'

const { event } = defineProps<{ event: Pick<components['schemas']['EventOut'], 'id' | 'title'> }>()

// Deleting is confirmed in the page itself, never in a dialog of the browser.
const confirming = ref(false)
const pending = ref(false)
const failure = ref<string | null>(null)

const { deleteEvent } = useEventWrites()

const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const confirmation = useTemplateRef<ComponentPublicInstance>('confirmation')

const question = computed(() => `Supprimer « ${event.title} » ?`)

// The focus follows the question, and comes back to the button once it is dismissed.
async function focus(target: Readonly<Ref<ComponentPublicInstance | null>>): Promise<void> {
  await nextTick()
  const element: unknown = target.value?.$el
  if (element instanceof HTMLElement) element.focus()
}

async function ask(): Promise<void> {
  confirming.value = true
  await focus(confirmation)
}

async function dismiss(): Promise<void> {
  confirming.value = false
  failure.value = null
  await focus(trigger)
}

async function confirm(): Promise<void> {
  pending.value = true
  failure.value = await deleteEvent(event.id)
  pending.value = false
  if (!failure.value) await navigateTo(EVENTS_PATH, { replace: true })
}
</script>

<template>
  <div class="max-w-3xl">
    <UiCallout
      v-if="confirming"
      ref="confirmation"
      tone="ambre"
      tabindex="-1"
      :icon="TriangleAlert"
      :title="question"
    >
      <p>Son programme et son « Bon à savoir » sont supprimés avec lui. La suppression est définitive.</p>
      <p
        v-if="failure"
        role="alert"
        class="font-semibold"
      >
        {{ failure }}
      </p>
      <template #actions>
        <UiButton
          size="sm"
          :loading="pending"
          @click="confirm"
        >
          Supprimer définitivement
        </UiButton>
        <UiButton
          variant="secondary"
          size="sm"
          @click="dismiss"
        >
          Annuler
        </UiButton>
      </template>
    </UiCallout>
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
