<script setup lang="ts">
import type { NuxtError } from '#app'

const { error } = defineProps<{ error: NuxtError }>()

// The texts of the first version's error pages. The error's own message is never
// shown: it is written for developers, and may come from anywhere.
const page = computed(() =>
  error.status === 404
    ? {
        title: 'Page introuvable',
        overline: 'Erreur 404',
        heading: 'Cette page n’existe pas',
        text: 'L’adresse a peut-être changé, ou la page a été supprimée.',
      }
    : {
        title: 'Erreur serveur',
        overline: `Erreur ${error.status ?? 500}`,
        heading: 'Une erreur est survenue',
        text: 'Le serveur n’a pas pu traiter la demande. Réessayez dans quelques instants.',
      },
)

// A page that could not open for the time being, such as a board page whose
// session could not be checked (middleware/auth.global.ts), can be tried again.
const retryPath = computed(() => {
  const data: unknown = error.data
  const path = typeof data === 'object' && data !== null && 'path' in data ? data.path : undefined
  return error.status !== 404 && typeof path === 'string' ? path : null
})

// Trying again comes first when it can be done.
const homeVariant = computed(() => (retryPath.value ? 'secondary' : 'primary'))

// Like the moderators' shortcuts of the first version: only a signed-in member
// sees the way back to the board.
const session = useSessionStore()
const signedIn = computed(() => session.accessToken !== null)

useHead({ title: () => `${page.value.title} — ${SITE_NAME}` })

function leave(path: string): Promise<void> {
  return clearError({ redirect: path })
}
</script>

<template>
  <NuxtLayout name="standalone">
    <StandaloneCard
      :overline="page.overline"
      :title="page.heading"
      tone="azur"
    >
      <template #lead>
        <p class="text-argent-600">
          {{ page.text }}
        </p>
      </template>
      <div class="flex flex-wrap gap-2">
        <UiButton
          v-if="retryPath"
          @click="leave(retryPath)"
        >
          Réessayer
        </UiButton>
        <!-- A link, which leads home without JavaScript too: the router clears
        the error as it leaves. -->
        <UiButton
          :variant="homeVariant"
          to="/"
        >
          Retour à l’accueil
        </UiButton>
        <UiButton
          v-if="signedIn"
          variant="secondary"
          @click="leave(BOARD_HOME_PATH)"
        >
          Espace bureau
        </UiButton>
      </div>
    </StandaloneCard>
  </NuxtLayout>
</template>
