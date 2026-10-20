<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

// What went wrong, in amber: a refusal of the API, a page or a write that
// failed. Screen readers announce it as soon as it shows.
</script>

<template>
  <UiCallout
    tone="ambre"
    role="alert"
    :icon="CircleAlert"
  >
    <slot />
    <template
      v-if="$slots.actions"
      #actions
    >
      <slot name="actions" />
    </template>
  </UiCallout>
</template>
