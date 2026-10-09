<script setup lang="ts">
import type { NuxtError } from '#app'

const { error } = defineProps<{ error: NuxtError }>()

const SITE_NAME = 'Comité des Fêtes d’Ons-en-Bray'

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
    <div class="flex w-full max-w-md flex-col gap-6 rounded-card border border-argent-200 bg-white p-6 md:p-8">
      <div class="flex flex-col gap-2">
        <p class="text-overline font-semibold text-azur-600 uppercase">
          {{ page.overline }}
        </p>
        <h1 class="font-display text-headline font-bold">
          {{ page.heading }}
        </h1>
        <p class="text-argent-600">
          {{ page.text }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton
          v-if="retryPath"
          @click="leave(retryPath)"
        >
          Réessayer
        </UiButton>
        <UiButton
          :variant="homeVariant"
          @click="leave('/')"
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
    </div>
  </NuxtLayout>
</template>
