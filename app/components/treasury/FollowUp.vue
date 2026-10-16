<script setup lang="ts">
import type { components } from '~/types/api'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

// « Relancer par e-mail »: a message from the member's own mail client (A3) to
// the member who advanced the expense, or else who recorded it, asking for its
// receipt. No member left to ask, no button.
const { entry, variant = 'secondary' } = defineProps<{
  entry: LedgerEntryOut
  /** Bordered, or dark within the treasury assistant. */
  variant?: 'secondary' | 'dark'
}>()

const session = useSessionStore()
const { amount } = useMoneyFormat()
const { calendarNumeric } = useDateFormat()
const origin = useRequestURL().origin

const link = computed(() => {
  const contact = entry.contact
  if (!contact) return null
  const body = [
    `${memberGreeting(contact)},`,
    '',
    `Le justificatif de la dépense « ${entry.label} » du ${calendarNumeric(entry.date)} (${amount(entry.amount)}) manque à la trésorerie. Il se dépose depuis l’espace bureau : ${origin}${entryPath(entry.id)}`,
    '',
    'Merci !',
    session.member?.first_name ?? '',
  ].join('\n').trimEnd()
  return mailtoLink(contact.email, `Justificatif à déposer : ${entry.label}`, body)
})
</script>

<template>
  <UiButton
    v-if="link"
    :to="link"
    external
    :variant
    size="sm"
  >
    Relancer par e-mail
  </UiButton>
</template>
