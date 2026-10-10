<script setup lang="ts">
import type { components } from '~/types/api'

type BoardMemberOut = components['schemas']['BoardMemberOut']

const { author, writtenAt, lead = false, size = 'md' } = defineProps<{
  /** None once the author's account is deleted. */
  author: BoardMemberOut | null
  writtenAt: string
  /** The author leads the event: their avatar stands out, as in the mockup. */
  lead?: boolean
  /** A note, or a smaller reply. */
  size?: 'sm' | 'md'
}>()

const { writtenDay } = useDateFormat()
const now = useNow()

const name = computed(() => authorName(author))
const day = computed(() => writtenDay(writtenAt, now.value))
</script>

<template>
  <div class="flex min-w-0 items-center gap-3">
    <UiAvatar
      :name
      :size
      :tone="lead ? 'soft' : 'neutral'"
    />
    <div class="flex min-w-0 flex-col leading-tight">
      <span class="truncate text-ui font-semibold text-sable-950">{{ name }}</span>
      <time
        :datetime="writtenAt"
        class="text-label text-argent-600"
      >{{ day }}</time>
    </div>
  </div>
</template>
