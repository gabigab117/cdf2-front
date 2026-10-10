<script setup lang="ts">
import type { components } from '~/types/api'

type PendingOut = components['schemas']['PendingOut']

// The « À traiter » panel the bell opens (A6): what awaits the board, each item
// leading to where it is dealt with. The documents to review, then the loans
// late or to prepare; the stock and the receipts join with their phases.
const { pending } = defineProps<{ pending: PendingOut | null }>()

const { calendarDay, calendarWeekday } = useDateFormat()
const now = useNow()

const total = computed(() => pending?.total ?? 0)
const documents = computed(() =>
  (pending?.documents.items ?? []).map(document => ({
    id: document.id,
    title: document.title,
    line: `${DOCUMENT_CATEGORIES[document.category].label} · ${calendarDay(document.date, now.value)}`,
  })),
)
const documentsCount = computed(() => pending?.documents.counts.total ?? 0)
// The panel lists the latest: the count leads to them all.
const allDocuments = computed(() =>
  documentsCount.value > documents.value.length ? `Voir les ${documentsCount.value} documents à vérifier` : null,
)

// The loans late, then those to prepare, under their own titles.
const loans = computed(() =>
  (pending?.loans.items ?? []).map(loan => ({
    id: loan.id,
    state: loan.state,
    title: loan.purpose ? `${loan.display_name} — ${loan.purpose}` : loan.display_name,
    line: loanHeadline(loan, parisDate(now.value), date => calendarWeekday(date, now.value)),
  })),
)
const loanSections = computed(() =>
  [
    { id: 'pending-overdue-loans', title: 'Prêts en retard', items: loans.value.filter(loan => loan.state === 'overdue') },
    { id: 'pending-loans-to-prepare', title: 'Prêts à préparer', items: loans.value.filter(loan => loan.state === 'to_prepare') },
  ].filter(section => section.items.length > 0),
)
const loansCount = computed(() => (pending ? pending.loans.overdue + pending.loans.to_prepare : 0))
const allLoans = computed(() => (loansCount.value > loans.value.length ? `Voir les ${loansCount.value} prêts à traiter` : null))
</script>

<template>
  <div class="flex flex-col gap-1">
    <h2 class="px-3 pt-2 pb-1 text-title font-semibold">
      À traiter
    </h2>
    <p
      v-if="total === 0"
      class="px-3 pb-3 text-sm text-argent-600"
    >
      Rien à traiter pour l’instant.
    </p>
    <section
      v-if="documents.length > 0"
      aria-labelledby="pending-documents"
      class="flex flex-col"
    >
      <h3
        id="pending-documents"
        class="px-3 pt-1 pb-1.5 text-overline font-semibold text-argent-600 uppercase"
      >
        Documents à vérifier
      </h3>
      <ul class="flex flex-col">
        <li
          v-for="document in documents"
          :key="document.id"
        >
          <NuxtLink
            :to="documentLocation(document.id)"
            class="flex flex-col gap-0.5 rounded-field px-3 py-2 transition-colors hover:bg-argent-100"
          >
            <span class="truncate text-ui font-medium text-sable-950">{{ document.title }}</span>
            <span class="text-label text-argent-600">{{ document.line }}</span>
          </NuxtLink>
        </li>
      </ul>
      <UiButton
        v-if="allDocuments"
        variant="link"
        class="mx-3 my-2 self-start"
        :to="TO_REVIEW_LOCATION"
      >
        {{ allDocuments }}
      </UiButton>
    </section>
    <section
      v-for="section in loanSections"
      :key="section.id"
      :aria-labelledby="section.id"
      class="flex flex-col"
    >
      <h3
        :id="section.id"
        class="px-3 pt-1 pb-1.5 text-overline font-semibold text-argent-600 uppercase"
      >
        {{ section.title }}
      </h3>
      <ul class="flex flex-col">
        <li
          v-for="loan in section.items"
          :key="loan.id"
        >
          <NuxtLink
            :to="loanLocation(loan.id)"
            class="flex flex-col gap-0.5 rounded-field px-3 py-2 transition-colors hover:bg-argent-100"
          >
            <span class="truncate text-ui font-medium text-sable-950">{{ loan.title }}</span>
            <span class="text-label text-argent-600">{{ loan.line }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
    <UiButton
      v-if="allLoans"
      variant="link"
      class="mx-3 my-2 self-start"
      :to="LOANS_PATH"
    >
      {{ allLoans }}
    </UiButton>
  </div>
</template>
