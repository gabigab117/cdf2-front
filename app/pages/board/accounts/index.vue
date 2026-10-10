<script setup lang="ts">
import { CircleAlert, CircleCheck } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors, Written } from '~/utils/api-errors'

type AccountIn = components['schemas']['AccountIn']
type InvitationOut = components['schemas']['InvitationOut']

definePageMeta({ path: '/bureau/membres' })

useHead({ title: 'Membres' })

// The superuser invites the board's members, and sends a new link to one who
// lost theirs or forgot their password (5.9). A position, a deactivation or a
// departure from the board are changed in the admin.
const route = useRoute()
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isInteger(value) && value > 1 ? value : 1
})

const { data, status, error, refresh } = useAccounts(() => page.value)
const { inviteMember, sendNewLink } = useAccountWrites()

// The page is the superuser's: anyone else meets the error page.
watch(error, (failure) => {
  if (failure?.status === 403) showError({ status: 403, statusText: 'Forbidden' })
})

const accounts = computed(() => data.value?.items ?? [])
const pageCount = computed(() => Math.ceil((data.value?.count ?? 0) / ACCOUNTS_PAGE_SIZE))
const loading = computed(() => status.value === 'pending')

// What the last write told: an email gone, or not.
const notice = ref<{ tone: 'azur' | 'ambre', text: string } | null>(null)
const sending = ref<number | null>(null)
const sendFailure = ref('')

function told({ account, sent }: InvitationOut, made: boolean): void {
  if (sent) notice.value = { tone: 'azur', text: `${made ? 'Invitation envoyée' : 'Nouveau lien envoyé'} à ${account.email}.` }
  else if (made) notice.value = { tone: 'ambre', text: 'Le compte est créé, mais l’e-mail n’est pas parti. Envoyez un nouveau lien.' }
  else notice.value = { tone: 'ambre', text: `L’e-mail n’est pas parti à ${account.email}. Réessayez dans quelques instants.` }
}

async function invite(payload: AccountIn): Promise<FormErrors | null> {
  const result = await inviteMember(payload)
  if (result.errors) return result.errors
  told(result.data, true)
  void refresh()
  return null
}

async function send(id: number): Promise<void> {
  sending.value = id
  sendFailure.value = ''
  const result: Written<InvitationOut> = await sendNewLink(id)
  sending.value = null
  if (result.errors) {
    sendFailure.value = [...result.errors.form, ...Object.values(result.errors.fields).flat()].join(' ')
    return
  }
  told(result.data, false)
  void refresh()
}

function pageLocation(target: number) {
  return { query: { page: target > 1 ? String(target) : undefined } }
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <div class="flex flex-col gap-1.5">
      <BoardPageTitle>Membres du bureau</BoardPageTitle>
      <p class="text-lead text-argent-600">
        Chaque membre invité choisit lui-même son mot de passe. Un membre qui l’a oublié reçoit un nouveau lien d’ici.
      </p>
    </div>
    <UiCallout
      v-if="notice"
      :tone="notice.tone"
      role="status"
      :icon="notice.tone === 'azur' ? CircleCheck : CircleAlert"
    >
      <p>{{ notice.text }}</p>
    </UiCallout>
    <UiCallout
      v-if="sendFailure"
      tone="ambre"
      role="alert"
      :icon="CircleAlert"
    >
      <p>{{ sendFailure }}</p>
    </UiCallout>
    <div class="flex flex-wrap items-start gap-5">
      <UiCard
        flush
        title="Comptes"
        class="min-w-0 flex-1 basis-150"
        :aria-busy="loading || undefined"
      >
        <BoardLoadError
          v-if="error && error.status !== 403"
          class="m-5.5"
          :message="error.message"
          @retry="refresh()"
        />
        <AccountsList
          v-else-if="accounts.length > 0"
          :accounts
          :sending
          @send="send"
        />
        <UiEmptyState v-else-if="!loading && !error">
          Aucun compte pour l’instant.
        </UiEmptyState>
        <UiPagination
          class="px-5.5 pb-4"
          :page
          :page-count
          :to="pageLocation"
        />
      </UiCard>
      <AccountsInviteForm
        class="min-w-0 flex-1 basis-80 md:max-w-100"
        :save="invite"
      />
    </div>
  </div>
</template>
