<script setup lang="ts">
const { cover } = defineProps<{
  /** The id of the event's cover, a photo the site may show (D17). */
  cover: number
}>()
</script>

<!-- The cover of an event's page, the chevron of the coat of arms rising from its foot. -->
<template>
  <div class="relative h-cover overflow-hidden rounded-4xl bg-sable-900">
    <SitePhoto
      :photo="cover"
      rendition="display"
    />
    <div
      class="absolute inset-x-0 bottom-0 h-2/5 bg-azur-500 chevron-band"
      aria-hidden="true"
    />
  </div>
</template>
