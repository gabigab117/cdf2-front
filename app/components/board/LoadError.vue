<script setup lang="ts">
const { message } = defineProps<{
  /** Why the page could not load, as errorMessage() words it. */
  message: string
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <UiAlert>
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
  </UiAlert>
</template>
