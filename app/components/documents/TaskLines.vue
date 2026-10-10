<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import type { ListedTask } from '~/utils/documents'

// The tasks minutes list, each with its title and whom it is for: validating
// the minutes creates them (D10). A line holds in the panel of a computer; on
// a phone, whom a task is for goes under its title, with its cross.
const tasks = defineModel<ListedTask[]>({ required: true })

const { errors } = defineProps<{
  /** What the API found wrong, by the path of a task's field: "extracted.tasks.0.title". */
  errors: Readonly<Record<string, string[]>>
}>()

const { data: members } = useBoardMembers()
const assignees = computed(() => memberOptions(members.value?.items ?? [], null, 'Personne'))

function add(): void {
  tasks.value = [...tasks.value, { title: '', assignee: null }]
}

function remove(index: number): void {
  tasks.value = tasks.value.filter((_task, position) => position !== index)
}

function lineErrors(index: number, field: string): readonly string[] | undefined {
  return errors[`extracted.tasks.${index}.${field}`]
}
</script>

<template>
  <fieldset class="flex flex-col gap-3">
    <legend class="mb-1.5 text-label font-semibold text-sable-600">
      Tâches à créer <span class="font-normal text-argent-600">(facultatif)</span>
    </legend>
    <div
      v-for="(task, index) in tasks"
      :key="index"
      class="flex flex-wrap items-start gap-2"
    >
      <UiField
        v-slot="{ id, describedby, invalid }"
        :label="`Tâche ${index + 1}`"
        hidden-label
        class="min-w-40 flex-1"
        :errors="lineErrors(index, 'title')"
      >
        <UiInput
          :id
          v-model="task.title"
          placeholder="Valider le devis sono"
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <div class="flex items-start gap-2">
        <UiField
          v-slot="{ id, describedby, invalid }"
          :label="`Assignée à (tâche ${index + 1})`"
          hidden-label
          class="w-40"
          :errors="lineErrors(index, 'assignee')"
        >
          <UiSelect
            :id
            v-model="task.assignee"
            :options="assignees"
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiIconButton
          :label="`Retirer la tâche ${index + 1}`"
          @click="remove(index)"
        >
          <X :size="16" />
        </UiIconButton>
      </div>
    </div>
    <UiButton
      variant="dashed"
      size="sm"
      class="self-start"
      @click="add"
    >
      <Plus :size="16" />
      Ajouter une tâche
    </UiButton>
  </fieldset>
</template>
