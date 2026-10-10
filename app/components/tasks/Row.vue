<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { TaskFields } from '~/utils/tasks'

type TaskOut = components['schemas']['TaskOut']

// A task of the « Tâches » tab: ticked, rewritten in place or deleted.
const { task } = defineProps<{ task: TaskOut }>()

const emit = defineEmits<{ changed: [] }>()

const { rewriteTask, deleteTask } = useTaskWrites()

const editing = ref(false)
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const { confirming, pending, failure, ask, dismiss, confirm } = useConfirmation(trigger)

const question = computed(() => `Supprimer la tâche « ${task.title} » ?`)

// Rewriting keeps the task done, or open, as it is.
function rewrite(fields: TaskFields): Promise<FormErrors | null> {
  return rewriteTask(task.id, taskPayload(fields, task.done_at !== null))
}

function rewritten(): void {
  editing.value = false
  emit('changed')
}

async function remove(): Promise<void> {
  if (await confirm(() => deleteTask(task.id))) emit('changed')
}
</script>

<template>
  <div class="flex flex-col gap-3 px-5.5 py-3.5">
    <TasksForm
      v-if="editing"
      :initial="taskFields(task, task.event)"
      :assignee="task.assignee"
      action="Enregistrer"
      cancellable
      :save="rewrite"
      @saved="rewritten"
      @cancel="editing = false"
    />
    <div
      v-else
      class="flex items-start justify-between gap-3"
    >
      <TasksItem
        :task
        @changed="emit('changed')"
      />
      <div class="flex shrink-0 gap-1.5">
        <UiIconButton
          label="Modifier la tâche"
          size="sm"
          @click="editing = true"
        >
          <Pencil :size="16" />
        </UiIconButton>
        <UiIconButton
          ref="trigger"
          label="Supprimer la tâche"
          size="sm"
          @click="ask"
        >
          <Trash2 :size="16" />
        </UiIconButton>
      </div>
    </div>
    <UiConfirmation
      v-if="confirming"
      :question
      :pending
      :failure
      @confirm="remove"
      @cancel="dismiss"
    />
  </div>
</template>
