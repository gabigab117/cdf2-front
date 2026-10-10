<script setup lang="ts">
import { CircleAlert, Send } from '@lucide/vue'
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

const LABELS: Readonly<Record<string, string>> = {
  email: 'Adresse e-mail',
  first_name: 'Prénom',
  last_name: 'Nom',
  position: 'Fonction',
}

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
  errors.value = refused ? placeErrors(refused, FIELDS, path => LABELS[path] ?? path) : null
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
      <UiCallout
        v-if="errors?.form.length"
        tone="ambre"
        role="alert"
        :icon="CircleAlert"
      >
        <p>{{ errors.form.join(' ') }}</p>
      </UiCallout>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Adresse e-mail"
        :errors="errors?.fields.email"
      >
        <UiInput
          :id
          v-model="fields.email"
          type="email"
          autocomplete="off"
          required
          :aria-describedby="describedby"
          :invalid
        />
      </UiField>
      <div class="grid grid-cols-2 gap-3">
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Prénom"
          :errors="errors?.fields.first_name"
        >
          <UiInput
            :id
            v-model="fields.firstName"
            autocomplete="off"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Nom"
          :errors="errors?.fields.last_name"
        >
          <UiInput
            :id
            v-model="fields.lastName"
            autocomplete="off"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
      </div>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Fonction"
        :errors="errors?.fields.position"
      >
        <UiSelect
          :id
          v-model="fields.position"
          :options="POSITION_OPTIONS"
          :aria-describedby="describedby"
          :invalid
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
