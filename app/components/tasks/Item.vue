<script setup lang="ts">
import type { components } from '~/types/api'

type TaskOut = components['schemas']['TaskOut']

// A task with its box: ticking it records it done, unticking opens it again.
const { task } = defineProps<{ task: TaskOut }>()

const emit = defineEmits<{ changed: [] }>()

const { rewriteTask } = useTaskWrites()
const now = useNow()

const pending = ref(false)
const failure = ref<string | null>(null)

const done = computed(() => task.done_at !== null)
const line = computed(() => taskLine(task, now.value))

async function toggle(event: Event): Promise<void> {
  const box = event.target as HTMLInputElement
  pending.value = true
  const errors = await rewriteTask(task.id, { ...receivedTaskIn(task), done: box.checked })
  pending.value = false
  failure.value = errors ? [...errors.form, ...Object.values(errors.fields).flat()].join(' ') : null
  // The box shows the task as the API keeps it: a refused change unticks it back.
  if (errors) box.checked = done.value
  else emit('changed')
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        class="mt-0.75 size-4.5 shrink-0 cursor-pointer accent-azur-600"
        :checked="done"
        :disabled="pending"
        @change="toggle"
      >
      <span class="flex min-w-0 flex-col leading-snug">
        <span
          class="text-ui"
          :class="done ? 'text-argent-600 line-through' : 'font-medium text-sable-950'"
        >{{ task.title }}</span>
        <span
          v-if="line"
          class="text-label text-argent-600"
        >{{ line }}</span>
      </span>
    </label>
    <p
      v-if="failure"
      role="alert"
      class="text-sm font-semibold text-ambre-800"
    >
      {{ failure }}
    </p>
  </div>
</template>
