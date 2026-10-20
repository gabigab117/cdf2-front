<script setup lang="ts">
import { Send } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type AccountIn = components['schemas']['AccountIn']

// « Inviter un membre »: their address and names, required, and their position.
// The member then chooses their password from the link of the email.
const { save } = defineProps<{
  /** Sends the invitation: the errors to show, or null once made. */
  save: (payload: AccountIn) => Promise<FormErrors | null>
}>()

const FIELDS = new Set(['email', 'first_name', 'last_name', 'position'])

function emptyFields() {
  return { email: '', firstName: '', lastName: '', position: NO_POSITION as PositionChoice }
}

const fields = reactive(emptyFields())
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

async function submit(): Promise<void> {
  pending.value = true
  const refused = await save({
    email: fields.email,
    first_name: fields.firstName,
    last_name: fields.lastName,
    position: fields.position === NO_POSITION ? null : fields.position,
  })
  pending.value = false
  errors.value = refused ? placeErrors(refused, FIELDS) : null
  if (!refused) Object.assign(fields, emptyFields())
}
</script>

<template>
  <UiCard title="Inviter un membre">
    <form
      class="flex flex-col gap-4"
      @submit.prevent="submit"
    >
      <p class="text-note text-argent-600">
        Le membre reçoit un e-mail avec un lien, valable 7 jours, pour choisir son mot de passe.
      </p>
      <UiAlert v-if="errors?.form.length">
        <p>{{ errors.form.join(' ') }}</p>
      </UiAlert>
      <UiField
        v-slot="{ control }"
        label="Adresse e-mail"
        :errors="errors?.fields.email"
      >
        <UiInput
          v-bind="control"
          v-model="fields.email"
          type="email"
          autocomplete="off"
          required
        />
      </UiField>
      <div class="grid grid-cols-2 gap-3">
        <UiField
          v-slot="{ control }"
          label="Prénom"
          :errors="errors?.fields.first_name"
        >
          <UiInput
            v-bind="control"
            v-model="fields.firstName"
            autocomplete="off"
            required
          />
        </UiField>
        <UiField
          v-slot="{ control }"
          label="Nom"
          :errors="errors?.fields.last_name"
        >
          <UiInput
            v-bind="control"
            v-model="fields.lastName"
            autocomplete="off"
            required
          />
        </UiField>
      </div>
      <UiField
        v-slot="{ control }"
        label="Fonction"
        :errors="errors?.fields.position"
      >
        <UiSelect
          v-bind="control"
          v-model="fields.position"
          :options="POSITION_OPTIONS"
        />
      </UiField>
      <UiButton
        type="submit"
        :loading="pending"
      >
        <Send :size="16" />
        Envoyer l’invitation
      </UiButton>
    </form>
  </UiCard>
</template>
