<script setup lang="ts">
import { CircleCheck } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'

// Linked from nowhere: board members reach it by its address, or on their way
// to a page of the board.
definePageMeta({ path: '/connexion', public: true, layout: 'standalone' })

useSeoMeta({ title: 'Connexion', robots: 'noindex, nofollow' })

const session = useSessionStore()
const route = useRoute()

// A member who just chose their password arrives with their address and the
// reason, in the state of the navigation (pages/set-password.vue): never in
// the address, which a log would keep.
const arrival: { email?: unknown, notice?: unknown } = window.history.state ?? {}

const credentials = reactive({ email: typeof arrival.email === 'string' ? arrival.email : '', password: '' })
const notice = typeof arrival.notice === 'string' ? arrival.notice : ''
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
    <StandaloneCard
      overline="Espace bureau"
      title="Connexion"
    >
      <UiAlert v-if="errors?.form.length">
        <p>{{ errors.form.join(' ') }}</p>
      </UiAlert>
      <UiCallout
        v-else-if="notice"
        role="status"
        :icon="CircleCheck"
      >
        <p>{{ notice }}</p>
      </UiCallout>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="signIn"
      >
        <UiField
          v-slot="{ control }"
          label="Adresse e-mail"
          :errors="errors?.fields.email"
        >
          <UiInput
            v-bind="control"
            v-model="credentials.email"
            type="email"
            autocomplete="username"
            required
          />
        </UiField>
        <UiField
          v-slot="{ control }"
          label="Mot de passe"
          :errors="errors?.fields.password"
        >
          <UiInput
            v-bind="control"
            v-model="credentials.password"
            type="password"
            autocomplete="current-password"
            required
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
    </StandaloneCard>
    <UiButton
      variant="link"
      to="/"
    >
      Retour au site
    </UiButton>
  </div>
</template>
