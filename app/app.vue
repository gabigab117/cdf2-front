<script setup lang="ts">
const SITE_NAME = 'Comité des Fêtes d’Ons-en-Bray'

useHead({
  titleTemplate: title => (title ? `${title} — ${SITE_NAME}` : SITE_NAME),
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
