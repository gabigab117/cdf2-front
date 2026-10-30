<script setup lang="ts">
import type { components } from '~/types/api'

const { photo, rendition, lazy = false } = defineProps<{
  photo: number
  rendition: components['schemas']['PhotoRendition']
  /** Read as it nears the screen, as the photos of a grid. */
  lazy?: boolean
}>()

const loading = computed(() => (lazy ? 'lazy' : undefined))
</script>

<!-- A photo of the site, filling its frame, without any text: it names no one (D17). -->
<template>
  <img
    :src="publicPhotoUrl(photo, rendition)"
    alt=""
    :loading
    class="size-full object-cover"
  >
</template>
