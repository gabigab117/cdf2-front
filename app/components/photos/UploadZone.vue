<script setup lang="ts">
// The drop zone of an album: its photos go one per request, one after the other,
// the server treating one at a time. A bar follows them; a photo refused is
// listed under its file's name, and the others go on. The album is fetched again
// once all are sent. Leaving the page stops those not sent yet.
const { albumId } = defineProps<{ albumId: number }>()

const emit = defineEmits<{ uploaded: [] }>()

const { uploadPhoto } = usePhotoWrites()

interface Refusal {
  name: string
  message: string
}

const zone = useTemplateRef<{ choose: () => void }>('zone')
const total = ref(0)
const sent = ref(0)
const refusals = ref<Refusal[]>([])
const queue: File[] = []
let sending = false

const progress = computed(() => `${countText(sent.value, 'photo envoyée', 'photos envoyées')} sur ${total.value}`)
const refused = computed(() => `${countText(refusals.value.length, 'photo refusée', 'photos refusées')} :`)

/** Opens the file picker: within a click, or the browser refuses. */
function choose(): void {
  zone.value?.choose()
}

defineExpose({ choose })

function chosen(file: File): void {
  // A new batch starts afresh; a file added while one is sent joins it.
  if (!sending) {
    total.value = 0
    sent.value = 0
    refusals.value = []
  }
  queue.push(file)
  total.value++
  if (!sending) void send()
}

async function send(): Promise<void> {
  sending = true
  for (let file = queue.shift(); file; file = queue.shift()) {
    const result = await uploadPhoto(albumId, file)
    if (result.errors) refusals.value = [...refusals.value, { name: file.name, message: refusalText(result.errors) }]
    sent.value++
  }
  sending = false
  emit('uploaded')
}

onBeforeUnmount(() => {
  queue.length = 0
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <UiDropZone
      ref="zone"
      :accept="PHOTO_TYPES"
      multiple
      action="parcourez vos fichiers"
      @choose="chosen"
    >
      Glissez des photos ici ou
      <template #hint>
        JPEG, PNG, HEIC — redimensionnées et sans données GPS.
      </template>
    </UiDropZone>
    <div
      v-if="total > 0 && sent < total"
      class="flex flex-col gap-2"
    >
      <p
        role="status"
        class="text-note text-sable-600"
      >
        {{ progress }}
      </p>
      <UiProgressBar
        :value="sent"
        :max="total"
        label="Envoi des photos"
        size="md"
      />
    </div>
    <UiAlert v-if="refusals.length > 0">
      <p class="font-semibold">
        {{ refused }}
      </p>
      <ul class="flex flex-col gap-1">
        <li
          v-for="(refusal, index) in refusals"
          :key="index"
        >
          {{ refusal.name }} : {{ refusal.message }}
        </li>
      </ul>
    </UiAlert>
  </div>
</template>
