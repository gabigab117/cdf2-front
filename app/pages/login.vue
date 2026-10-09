<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'

// Linked from nowhere: board members reach it by its address, or on their way
// to a page of the board.
definePageMeta({ path: '/connexion', public: true, layout: 'standalone' })

useSeoMeta({ title: 'Connexion', robots: 'noindex, nofollow' })

const session = useSessionStore()
const route = useRoute()

const credentials = reactive({ email: '', password: '' })
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

async function signIn(): Promise<void> {
  pending.value = true
  errors.value = await session.signIn(credentials)
  pending.value = false
  if (errors.value) {
    credentials.password = ''
    return
  }
  await navigateTo(safeRedirect(route.query.redirect), { replace: true })
}
</script>

<template>
  <div class="flex w-full flex-col items-center gap-6">
    <div class="flex w-full max-w-md flex-col gap-6 rounded-card border border-argent-200 bg-white p-6 md:p-8">
      <div class="flex flex-col gap-2">
        <p class="text-overline font-semibold text-argent-600 uppercase">
          Espace bureau
        </p>
        <h1 class="font-display text-headline font-bold">
          Connexion
        </h1>
      </div>
      <UiCallout
        v-if="errors?.form.length"
        tone="ambre"
        role="alert"
        :icon="CircleAlert"
      >
        <p>{{ errors.form.join(' ') }}</p>
      </UiCallout>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="signIn"
      >
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Adresse e-mail"
          :errors="errors?.fields.email"
        >
          <UiInput
            :id
            v-model="credentials.email"
            type="email"
            autocomplete="username"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Mot de passe"
          :errors="errors?.fields.password"
        >
          <UiInput
            :id
            v-model="credentials.password"
            type="password"
            autocomplete="current-password"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiButton
          class="mt-2"
          type="submit"
          size="lg"
          block
          :loading="pending"
        >
          Se connecter
        </UiButton>
      </form>
    </div>
    <UiButton
      variant="link"
      to="/"
    >
      Retour au site
    </UiButton>
  </div>
</template>
