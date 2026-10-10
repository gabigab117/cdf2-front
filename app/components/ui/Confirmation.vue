<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'

// An action asked in the page itself, never in a dialog of the browser: the
// question takes the focus as it shows (useConfirmation brings it back).
const { question, pending = false, failure = null, action = 'Supprimer définitivement' } = defineProps<{
  question: string
  /** The action is under way. */
  pending?: boolean
  /** Why the action failed, shown with the question. */
  failure?: string | null
  /** The button that confirms. */
  action?: string
}>()

const emit = defineEmits<{ confirm: [], cancel: [] }>()

const callout = useTemplateRef<ComponentPublicInstance>('callout')

onMounted(() => {
  const element: unknown = callout.value?.$el
  if (element instanceof HTMLElement) element.focus()
})
</script>

<template>
  <UiCallout
    ref="callout"
    tone="ambre"
    tabindex="-1"
    :icon="TriangleAlert"
    :title="question"
  >
    <slot />
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
        @click="emit('confirm')"
      >
        {{ action }}
      </UiButton>
      <UiButton
        variant="secondary"
        size="sm"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
    </template>
  </UiCallout>
</template>
