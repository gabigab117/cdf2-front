<script setup lang="ts">
const { latitude, longitude, venue } = defineProps<{
  latitude: number
  longitude: number
  /** The place it shows, which names the map for screen readers. */
  venue: string
}>()

// No third party is called before the visitor asks: the preview is drawn
// here, and the map of OpenStreetMap only loads on a click. Without
// JavaScript, the link opens the map on openstreetmap.org.
const loaded = ref(false)

const SPAN = 0.004
const page = computed(() => `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`)
const embed = computed(() => {
  const box = [longitude - SPAN, latitude - SPAN / 2, longitude + SPAN, latitude + SPAN / 2].join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${latitude},${longitude}`
})

function load(event: MouseEvent): void {
  event.preventDefault()
  loaded.value = true
}
</script>

<template>
  <iframe
    v-if="loaded"
    :src="embed"
    :title="`Plan d’accès : ${venue}`"
    class="h-37.5 w-full rounded-banner border-0"
  />
  <a
    v-else
    :href="page"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`Afficher le plan d’accès : ${venue} (OpenStreetMap)`"
    class="relative flex h-37.5 items-center justify-center overflow-hidden rounded-banner bg-argent-100 map-grid"
    @click="load"
  >
    <span
      class="inline-flex size-11 -rotate-45 items-center justify-center rounded-full rounded-bl-none bg-azur-600 shadow-pin"
      aria-hidden="true"
    >
      <span class="size-3.5 rounded-full bg-white" />
    </span>
    <span class="absolute bottom-3 left-3 rounded-full bg-white px-2.5 py-1 text-caption text-sable-600">Carte interactive</span>
  </a>
</template>
