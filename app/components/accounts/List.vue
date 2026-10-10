<script setup lang="ts">
import type { components } from '~/types/api'

type AccountOut = components['schemas']['AccountOut']

// The accounts of the board: who each is, and where their account stands. An
// account not deactivated may receive a new link, which the page sends.
const { accounts, sending = null } = defineProps<{
  accounts: readonly AccountOut[]
  /** The account whose link is going. */
  sending?: number | null
}>()

const emit = defineEmits<{ send: [id: number] }>()

const { writtenDay } = useDateFormat()
const now = useNow()

const rows = computed(() =>
  accounts.map(account => ({
    id: account.id,
    name: [account.first_name, account.last_name].filter(Boolean).join(' ') || account.email,
    details: [account.position, account.email].filter(Boolean).join(' · '),
    pill: accountPill(account, iso => writtenDay(iso, now.value)),
    linkable: account.state !== 'inactive',
  })),
)
</script>

<template>
  <ul class="divide-y divide-argent-100">
    <li
      v-for="row in rows"
      :key="row.id"
      class="flex flex-wrap items-center gap-x-4 gap-y-2 px-5.5 py-4"
    >
      <span class="flex min-w-0 flex-1 basis-60 flex-col gap-1">
        <span class="flex flex-wrap items-center gap-2">
          <span class="font-semibold text-sable-950">{{ row.name }}</span>
          <UiStatusPill
            :tone="row.pill.tone"
            size="sm"
          >
            {{ row.pill.label }}
          </UiStatusPill>
        </span>
        <span class="truncate text-note text-argent-600">{{ row.details }}</span>
      </span>
      <UiButton
        v-if="row.linkable"
        variant="secondary"
        size="sm"
        :loading="sending === row.id"
        @click="emit('send', row.id)"
      >
        Envoyer un nouveau lien
      </UiButton>
    </li>
  </ul>
</template>
