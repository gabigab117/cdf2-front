<script setup lang="ts">
import { Download, Eye, EyeOff, ShieldAlert, ShieldCheck, Star, X } from '@lucide/vue'
import type { components } from '~/types/api'

type AlbumOut = components['schemas']['AlbumOut']
type PhotoOut = components['schemas']['PhotoOut']

// The bar of a selection, floating at the foot of the album as in the mockup. Its
// actions apply to every photo selected; hiding, and the check of the image
// rights (D17), turn back when the whole selection has them already. The cover
// is a single photo; a deletion asks first.
const { album, photos } = defineProps<{
  album: Pick<AlbumOut, 'id' | 'title'>
  /** The photos selected, in the album's order. */
  photos: readonly PhotoOut[]
}>()

const emit = defineEmits<{ clear: [], changed: [], deleted: [] }>()

const { setAlbumCover, hidePhotos, reviewImageRights, deletePhotos, downloadPhotos } = usePhotoWrites()

const pending = ref(false)
const failure = ref<string | null>(null)

const ids = computed(() => photos.map(photo => photo.id))
const flags = computed(() => selectionFlags(photos))
const count = computed(() => selectionText(photos.length))
const single = computed(() => photos.length === 1)
const hideLabel = computed(() => (flags.value.hidden ? 'Réafficher' : 'Masquer du site'))
const reviewLabel = computed(() => (flags.value.toReview ? 'Vérifiée' : 'À vérifier'))
const question = computed(() => `Supprimer définitivement ${photosText(photos.length)} ?`)

const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const { confirming, pending: deleting, failure: deleteFailure, ask, dismiss, confirm } = useConfirmation(trigger)

// A download changes nothing of the album: it alone does not have it fetched again.
async function act(write: () => Promise<string | null>, changes = true): Promise<void> {
  pending.value = true
  failure.value = await write()
  pending.value = false
  if (changes && !failure.value) emit('changed')
}

function chooseCover(): Promise<void> {
  return act(() => setAlbumCover(album.id, ids.value[0] ?? null))
}

function hide(): Promise<void> {
  return act(() => hidePhotos(album.id, ids.value, !flags.value.hidden))
}

function review(): Promise<void> {
  return act(() => reviewImageRights(album.id, ids.value, !flags.value.toReview))
}

function download(): Promise<void> {
  return act(() => downloadPhotos(album, ids.value), false)
}

async function deleteSelection(): Promise<void> {
  if (await confirm(() => deletePhotos(album.id, ids.value))) emit('deleted')
}

const classes = {
  action: 'inline-flex h-10 items-center gap-1.5 rounded-icon px-2 text-sm font-medium text-white transition-colors hover:bg-sable-800 disabled:cursor-not-allowed disabled:text-argent-450 disabled:hover:bg-transparent',
  delete: 'inline-flex h-10 items-center rounded-icon bg-sable-700 px-3.5 text-sm font-medium text-white transition-colors hover:bg-sable-650',
}
</script>

<template>
  <div class="sticky bottom-6 z-10 flex max-w-full flex-col items-center gap-3 self-center">
    <UiConfirmation
      v-if="confirming"
      :question
      :pending="deleting"
      :failure="deleteFailure"
      @confirm="deleteSelection"
      @cancel="dismiss"
    />
    <div class="flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-banner bg-sable-950 p-2 text-white shadow-float">
      <UiIconButton
        label="Désélectionner"
        size="sm"
        surface="dark"
        @click="emit('clear')"
      >
        <X :size="16" />
      </UiIconButton>
      <p
        role="status"
        class="mx-1 text-ui font-semibold"
      >
        {{ count }}
      </p>
      <button
        type="button"
        :class="classes.action"
        :disabled="!single || pending"
        @click="chooseCover"
      >
        <Star
          :size="16"
          aria-hidden="true"
        />
        Couverture
      </button>
      <button
        type="button"
        :class="classes.action"
        :disabled="pending"
        @click="hide"
      >
        <Eye
          v-if="flags.hidden"
          :size="16"
          aria-hidden="true"
        />
        <EyeOff
          v-else
          :size="16"
          aria-hidden="true"
        />
        {{ hideLabel }}
      </button>
      <button
        type="button"
        :class="classes.action"
        :disabled="pending"
        @click="review"
      >
        <ShieldCheck
          v-if="flags.toReview"
          :size="16"
          aria-hidden="true"
        />
        <ShieldAlert
          v-else
          :size="16"
          aria-hidden="true"
        />
        {{ reviewLabel }}
      </button>
      <button
        type="button"
        :class="classes.action"
        :disabled="pending"
        @click="download"
      >
        <Download
          :size="16"
          aria-hidden="true"
        />
        Télécharger
      </button>
      <button
        ref="trigger"
        type="button"
        :class="classes.delete"
        @click="ask"
      >
        Supprimer
      </button>
    </div>
    <p
      v-if="failure"
      role="alert"
      class="rounded-icon bg-sable-950 px-3.5 py-2 text-note font-semibold text-ambre-400"
    >
      {{ failure }}
    </p>
  </div>
</template>
