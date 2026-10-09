<script setup lang="ts">
const { preprod } = useRuntimeConfig().public
</script>

<template>
  <p
    v-if="preprod"
    class="bg-ambre-50 px-4 py-2 text-center text-note font-medium text-ambre-800"
  >
    Préproduction — données fictives
  </p>
</template>
