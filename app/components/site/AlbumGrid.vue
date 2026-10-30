<script setup lang="ts">
import type { components } from '~/types/api'

const { albums } = defineProps<{ albums: Array<components['schemas']['PublicAlbumItemOut']> }>()
</script>

<!-- The albums of the site, two to a row on a phone. -->
<template>
  <ul class="grid grid-cols-2 gap-2.5 md:grid-cols-albums md:gap-5">
    <li
      v-for="album in albums"
      :key="album.slug"
    >
      <SiteAlbumCard :album />
    </li>
  </ul>
</template>
