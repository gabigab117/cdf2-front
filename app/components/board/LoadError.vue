<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

const { message } = defineProps<{
  /** Why the page could not load, as errorMessage() words it. */
  message: string
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <UiCallout
    tone="ambre"
    role="alert"
    :icon="CircleAlert"
  >
    <p>{{ message }}</p>
    <template #actions>
      <UiButton
        variant="secondary"
        size="sm"
        @click="emit('retry')"
      >
        Réessayer
      </UiButton>
    </template>
  </UiCallout>
</template>
