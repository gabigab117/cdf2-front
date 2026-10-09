<script setup lang="ts">
import { Construction } from '@lucide/vue'

// Every entry of the navigation leads somewhere until its screen arrives: this
// page stands in for it, and says which card of the roadmap brings it.
const { title, card, cardTitle } = defineProps<{
  /** The screen's name, as in the navigation. */
  title: string
  /** The card of the roadmap that builds the screen, and its title. */
  card: string
  cardTitle: string
}>()

useHead({ title })
</script>

<template>
  <div class="flex flex-col gap-7">
    <BoardPageTitle>{{ title }}</BoardPageTitle>
    <UiCallout
      :icon="Construction"
      title="Écran en préparation"
      class="max-w-2xl"
    >
      <p>Cet écran arrive avec la card {{ card }}, « {{ cardTitle }} ».</p>
    </UiCallout>
  </div>
</template>
