<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import type { FormErrors } from '~/utils/api-errors'

// The page of the link an invited member, or one who forgot their password,
// receives (5.9). Rendered in the browser alone: the link's token follows the
// « # », which the browser never sends to the server.
definePageMeta({ path: '/choisir-mot-de-passe', public: true, layout: 'standalone' })

useSeoMeta({ title: 'Choisir mon mot de passe', robots: 'noindex, nofollow' })

const INVALID_LINK = 'Ce lien n’est plus valable. Demandez-en un nouveau à la personne qui gère les comptes du bureau.'

const FIELDS = new Set(['password', 'confirmation'])

const { checkLink, choosePassword } = usePasswordWrites()

// The link of the address: a second email opened in the same tab changes the
// fragment alone, which the page follows.
const route = useRoute()
const link = computed(() => passwordLink(route.hash))
// The link checked: the account it leads to, or why it holds no more.
const account = ref<string | null>(null)
const refusal = ref('')
const fields = reactive({ password: '', confirmation: '' })
const errors = ref<FormErrors | null>(null)
const pending = ref(false)

async function check(): Promise<void> {
  account.value = null
  errors.value = null
  const asked = link.value
  if (!asked) {
    refusal.value = INVALID_LINK
    return
  }
  refusal.value = ''
  const result = await checkLink(asked)
  if (result.errors) refusal.value = result.errors.form.join(' ') || INVALID_LINK
  else account.value = result.data.email
}

onMounted(check)
watch(link, check)

async function submit(): Promise<void> {
  if (!link.value) return
  pending.value = true
  const result = await choosePassword({ ...link.value, ...fields })
  pending.value = false
  if (result.errors) {
    errors.value = placeErrors(result.errors, FIELDS, path => path)
    fields.password = ''
    fields.confirmation = ''
    return
  }
  // No session opens: the sign-in page takes the address, and says why, by
  // the state of the navigation rather than by an address a log would keep.
  await navigateTo(
    { path: SIGN_IN_PATH, state: { email: result.data.email, notice: 'Mot de passe enregistré. Vous pouvez vous connecter.' } },
    { replace: true },
  )
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
          Choisir mon mot de passe
        </h1>
        <p
          v-if="account"
          class="text-note text-argent-600"
        >
          Pour le compte {{ account }}
        </p>
      </div>
      <UiCallout
        v-if="refusal"
        tone="ambre"
        role="alert"
        :icon="CircleAlert"
      >
        <p>{{ refusal }}</p>
      </UiCallout>
      <form
        v-else-if="account"
        class="flex flex-col gap-4"
        @submit.prevent="submit"
      >
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
          label="Mot de passe"
          help="Au moins 8 caractères, ni trop courant, ni proche de votre nom ou de votre adresse."
          :errors="errors?.fields.password"
        >
          <UiInput
            :id
            v-model="fields.password"
            type="password"
            autocomplete="new-password"
            required
            :aria-describedby="describedby"
            :invalid
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Confirmation"
          :errors="errors?.fields.confirmation"
        >
          <UiInput
            :id
            v-model="fields.confirmation"
            type="password"
            autocomplete="new-password"
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
          Enregistrer mon mot de passe
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
