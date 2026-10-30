<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type AlbumIn = components['schemas']['AlbumIn']
type AlbumOut = components['schemas']['AlbumOut']
type EventOut = components['schemas']['EventOut']

// The form of an album: a new one, private until it is published (D17), or one to
// correct. Only an album already recorded can be deleted, its photos with it.
const { album = null, event = null, save, remove } = defineProps<{
  /** The album to correct, or none for a new one. */
  album?: AlbumOut | null
  /** The event a new album is made for: its title and day come filled in. */
  event?: Pick<EventOut, 'id' | 'title' | 'starts_at'> | null
  /** Sends the album: the errors to show, or null once it is saved. */
  save: (fields: AlbumIn) => Promise<FormErrors | null>
  /** Deletes the album: null once done, or the message to show. */
  remove?: () => Promise<string | null>
}>()

const emit = defineEmits<{ saved: [], cancel: [], deleted: [] }>()

const fields = ref<AlbumIn>(album ? albumFields(album) : newAlbumFields(event ?? undefined))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

const SHOWN: ReadonlySet<string> = new Set(['title', 'date', 'event'])

const eventOptions = useEventChoices('Aucun événement')

const form = useTemplateRef<HTMLFormElement>('form')
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending: deleting, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const submitLabel = album ? 'Enregistrer' : 'Créer l’album'

const question = computed(() => {
  if (!album) return ''
  const photos = album.photos_count === 0 ? '' : album.photos_count === 1 ? ' et sa photo' : ` et ses ${album.photos_count} photos`
  return `Supprimer « ${album.title} »${photos} ?`
})

async function submit(): Promise<void> {
  pending.value = true
  const result = await save(fields.value)
  pending.value = false
  if (result) {
    errors.value = placeErrors(result, SHOWN)
    await focusErrors(form)
    return
  }
  errors.value = null
  emit('saved')
}

async function deleteAlbum(): Promise<void> {
  if (remove && await confirm(remove)) emit('deleted')
}
</script>

<template>
  <form
    ref="form"
    class="flex flex-col gap-4"
    @submit.prevent="submit"
  >
    <UiAlert
      v-if="errors?.form.length"
      tabindex="-1"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiAlert>
    <UiField
      v-slot="{ control }"
      label="Titre"
      :errors="errors?.fields.title"
    >
      <UiInput
        v-bind="control"
        v-model="fields.title"
        maxlength="120"
        required
      />
    </UiField>
    <UiField
      v-slot="{ control }"
      label="Date"
      :errors="errors?.fields.date"
    >
      <UiInput
        v-bind="control"
        v-model="fields.date"
        type="date"
        required
      />
    </UiField>
    <UiField
      v-slot="{ control }"
      label="Événement"
      optional
      :errors="errors?.fields.event"
    >
      <UiSelect
        v-bind="control"
        v-model="fields.event"
        :options="eventOptions"
      />
    </UiField>
    <div class="flex flex-wrap items-center gap-2">
      <UiButton
        type="submit"
        :loading="pending"
      >
        {{ submitLabel }}
      </UiButton>
      <UiButton
        variant="secondary"
        @click="emit('cancel')"
      >
        Annuler
      </UiButton>
      <UiButton
        v-if="remove"
        ref="trigger"
        variant="link"
        class="ml-auto"
        @click="ask"
      >
        <Trash2 :size="16" />
        Supprimer l’album
      </UiButton>
    </div>
    <UiConfirmation
      v-if="confirming"
      :question
      :pending="deleting"
      :failure
      @confirm="deleteAlbum"
      @cancel="dismiss"
    />
  </form>
</template>
