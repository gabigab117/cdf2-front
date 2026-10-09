<script setup lang="ts">
useHead({
  titleTemplate: title => (title ? `${title} — ${SITE_NAME}` : SITE_NAME),
})

// The preproduction holds fictitious data: none of its pages is ever indexed,
// whatever the server's headers say.
if (useRuntimeConfig().public.preprod) useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
