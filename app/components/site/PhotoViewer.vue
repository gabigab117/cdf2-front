<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { components } from '~/types/api'

// A photo of an album in large, above the page, and the way to the others: the
// buttons, or the arrows of the keyboard. No name, no date: the site gives none
// (D17).
const open = defineModel<boolean>('open', { default: false })
const index = defineModel<number>('index', { required: true })

const { album } = defineProps<{ album: components['schemas']['PublicAlbumOut'] }>()

const photo = computed(() => album.photos[index.value])
const subtitle = computed(() => `Photo ${index.value + 1} sur ${album.photos.length}`)
const first = computed(() => index.value === 0)
const last = computed(() => index.value === album.photos.length - 1)

function go(step: number): void {
  const next = index.value + step
  if (next >= 0 && next < album.photos.length) index.value = next
}
</script>

<template>
  <UiModal
    v-model:open="open"
    :title="album.title"
    :subtitle
    @keydown.left="go(-1)"
    @keydown.right="go(1)"
  >
    <template #actions>
      <UiIconButton
        label="Photo précédente"
        size="sm"
        :disabled="first"
        @click="go(-1)"
      >
        <ChevronLeft :size="16" />
      </UiIconButton>
      <UiIconButton
        label="Photo suivante"
        size="sm"
        :disabled="last"
        @click="go(1)"
      >
        <ChevronRight :size="16" />
      </UiIconButton>
    </template>
    <img
      v-if="photo !== undefined"
      :key="photo"
      :src="publicPhotoUrl(photo, 'display')"
      :alt="subtitle"
      class="min-h-0 flex-1 object-contain p-4 md:p-8"
    >
  </UiModal>
</template>
