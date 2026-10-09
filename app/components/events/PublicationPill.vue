<script setup lang="ts">
const { published, detailed = false } = defineProps<{
  published: boolean
  /** On the event's page: larger, and saying where the event is published. */
  detailed?: boolean
}>()

const size = computed(() => (detailed ? 'lg' : 'md'))
const label = computed(() => {
  if (!published) return 'Non publié'
  return detailed ? 'Publié sur le site' : 'Publié'
})
</script>

<template>
  <UiStatusPill
    :tone="published ? 'azur' : 'neutral'"
    :size
    :dot="published"
  >
    {{ label }}
  </UiStatusPill>
</template>
