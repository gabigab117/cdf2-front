<script setup lang="ts">
import { EyeOff, Star } from '@lucide/vue'
import type { components } from '~/types/api'

type PhotoOut = components['schemas']['PhotoOut']

// A photo in large, above the page: its display size, with the day it was taken
// and the member who added it, for the board to judge it, its image rights first
// (D17). Read once per photo, it stays while the viewer fades out.
const open = defineModel<boolean>('open', { default: false })

const { photo, cover = false } = defineProps<{
  photo: PhotoOut
  /** The photo is its album's cover. */
  cover?: boolean
}>()

const now = useNow()
const { dayInWords, time } = useDateFormat()

const subtitle = computed(() =>
  [
    photo.taken_at && `Prise le ${dayInWords(photo.taken_at, now.value)} à ${time(photo.taken_at)}`,
    photo.uploaded_by && `ajoutée par ${memberName(photo.uploaded_by)}`,
  ].filter(Boolean).join(' · '))
</script>

<template>
  <UiModal
    v-model:open="open"
    :title="photo.original_name"
    :subtitle
  >
    <template #actions>
      <div class="flex flex-wrap justify-end gap-1.5 max-md:hidden">
        <UiStatusPill
          v-if="cover"
          tone="dark"
        >
          <Star
            :size="13"
            aria-hidden="true"
          />
          Couverture
        </UiStatusPill>
        <UiStatusPill
          v-if="photo.image_rights_to_review"
          tone="ambre"
        >
          À vérifier
        </UiStatusPill>
        <UiStatusPill
          v-if="photo.hidden"
          tone="neutral"
        >
          <EyeOff
            :size="13"
            aria-hidden="true"
          />
          Masquée du site
        </UiStatusPill>
      </div>
    </template>
    <PhotosRendition
      :key="photo.id"
      :photo="photo.id"
      rendition="display"
      fit="contain"
      :alt="photo.original_name"
      class="min-h-0 flex-1 p-4 md:p-8"
    />
  </UiModal>
</template>
