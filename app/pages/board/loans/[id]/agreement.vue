<script setup lang="ts">
import { Printer } from '@lucide/vue'
import type { components } from '~/types/api'

type LoanBorrowerType = components['schemas']['LoanBorrowerType']

definePageMeta({ path: '/bureau/prets/:id(\\d+)/convention', topBarAction: true })

useHead({ title: 'Convention de prêt' })

const id = Number(useRoute().params.id)

const { data: loan, error, refresh } = await useLoan(id)
if (error.value?.status === 404) showError({ status: 404, statusText: 'Not Found' })

const { public: { office, contact } } = useRuntimeConfig()
const { calendarNumeric } = useDateFormat()
const { amount } = useMoneyFormat()

// The agreement of the v1: who lends, who borrows, what, for how long, against
// which cheques, and on which terms. What the loan does not know, the members
// fill in by hand; its remarks, kept for the board, are never printed.
const BORROWERS: Record<Exclude<LoanBorrowerType, 'committee'>, string> = {
  association: 'L’association',
  individual: 'Le particulier',
  municipality: 'La commune',
}

const ENGAGEMENTS = [
  'L’emprunteur reconnaît que le matériel confié est en parfait état de fonctionnement et de propreté, et s’engage à le récupérer et le restituer aux dates et heures indiquées par le Prêteur, selon les conditions dictées par ce dernier.',
  'Lors du retour, un contrôle sera effectué (fonctionnement, propreté, conditionnement). Si une anomalie est constatée, la totalité de la caution sera conservée.',
  'En cas de dysfonctionnement, le coût de la réparation sera à la charge de l’emprunteur.',
  'Si le matériel est rendu inutilisable, son remplacement par un matériel neuf et identique sera exigé aux frais de l’emprunteur.',
]

const CHEQUES = [1, 2, 3]

const reference = computed(() => loan.value?.number ?? 'Réservation interne')
const breadcrumb = computed(() => [
  { label: 'Prêts', to: LOANS_PATH },
  { label: reference.value, to: loanLocation(id) },
  { label: 'Convention' },
])

// A committee loan keeps its equipment for an event: no one signs for it.
const agreement = computed(() => {
  const shown = loan.value
  if (!shown || shown.borrower_type === 'committee') return null
  return {
    borrower: BORROWERS[shown.borrower_type],
    start: calendarNumeric(shown.start_date),
    end: calendarNumeric(shown.end_date),
    deposit: Number(shown.deposit_amount) > 0 ? amount(shown.deposit_amount) : null,
  }
})
const officeLine = [office.street, office.town].filter(Boolean).join(' – ')
const contactLine = [contact.phone, contact.email].filter(Boolean).join(' · ')

function print(): void {
  window.print()
}
</script>

<template>
  <div class="flex flex-col gap-5.5">
    <Teleport
      defer
      to="#board-top-bar-action"
    >
      <BoardTopBarButton
        v-if="agreement"
        :icon="Printer"
        label="Imprimer / Enregistrer en PDF"
        @click="print"
      />
    </Teleport>
    <template v-if="loan">
      <UiBreadcrumb
        class="print:hidden"
        :items="breadcrumb"
        back
      />
      <div
        v-if="agreement"
        class="overflow-x-auto print:overflow-visible"
      >
        <article
          aria-label="Convention de prêt"
          class="mx-auto flex a4-sheet flex-col gap-2 bg-white text-sable-950 shadow-sheet print:min-h-0 print:shadow-none"
        >
          <header class="flex flex-col gap-0.5 border-b-2 border-sable-950 pb-1.5 text-center">
            <p class="text-sm font-semibold uppercase">
              {{ SITE_NAME }}
            </p>
            <h1 class="text-lg font-bold uppercase">
              Convention de prêt de matériel
            </h1>
            <p
              v-if="officeLine"
              class="text-xs"
            >
              {{ officeLine }}
            </p>
            <p
              v-if="contactLine"
              class="text-xs"
            >
              {{ contactLine }}
            </p>
            <p class="text-xs font-semibold">
              Prêt {{ loan.number }}
            </p>
          </header>
          <p class="text-center text-xs text-sable-600 italic">
            En aucun cas une association ne peut être contrainte de prêter du matériel.
          </p>
          <LoansAgreementSection title="Le prêteur">
            <LoansAgreementField
              label="L’association"
              :value="`Le ${SITE_NAME}`"
            />
            <LoansAgreementField label="Représentée par" />
            <LoansAgreementField label="Agissant en qualité de" />
          </LoansAgreementSection>
          <LoansAgreementSection title="L’emprunteur">
            <LoansAgreementField
              :label="agreement.borrower"
              :value="loan.borrower_name"
            />
            <div class="flex flex-wrap gap-x-4 gap-y-1.5">
              <LoansAgreementField label="Représenté par" />
              <LoansAgreementField label="Agissant en qualité de" />
            </div>
            <LoansAgreementField label="Adresse" />
            <div class="flex flex-wrap gap-x-4 gap-y-1.5">
              <LoansAgreementField
                label="Code postal"
                short
              />
              <LoansAgreementField label="Ville" />
            </div>
            <LoansAgreementField
              label="Téléphone / e-mail"
              :value="loan.phone"
            />
            <LoansAgreementField
              label="Objet du prêt"
              :value="loan.purpose"
            />
          </LoansAgreementSection>
          <LoansAgreementSection title="Matériel prêté">
            <table class="w-full border-collapse text-caption">
              <thead>
                <tr class="text-overline uppercase">
                  <th class="border border-argent-400 px-2 py-1 text-left">
                    Désignation
                  </th>
                  <th class="w-24 border border-argent-400 px-2 py-1 text-right">
                    Quantité
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="line in loan.lines"
                  :key="line.id"
                >
                  <td class="border border-argent-400 px-2 py-1">
                    {{ line.equipment.name }}
                  </td>
                  <td class="border border-argent-400 px-2 py-1 text-right tabular-nums">
                    {{ line.quantity }}
                  </td>
                </tr>
                <tr class="h-6">
                  <td class="border border-argent-400" />
                  <td class="border border-argent-400" />
                </tr>
              </tbody>
            </table>
          </LoansAgreementSection>
          <LoansAgreementSection title="Durée du prêt">
            <div class="flex flex-wrap gap-x-4 gap-y-1.5">
              <LoansAgreementField
                label="Date de prise en charge"
                :value="agreement.start"
              />
              <LoansAgreementField
                label="Date de restitution"
                :value="agreement.end"
              />
            </div>
            <LoansAgreementField label="Lieu de remise et de restitution" />
          </LoansAgreementSection>
          <LoansAgreementSection title="Cautions et garanties">
            <template v-if="agreement.deposit">
              <p class="text-justify text-xs">
                Les chèques sont encaissés en cas de dommage, de non-restitution ou de non-respect des conditions. Ils sont restitués à l’emprunteur dès validation du bon retour du matériel (propre, complet, fonctionnel).
              </p>
              <LoansAgreementField
                label="Caution demandée"
                :value="agreement.deposit"
              />
              <div
                v-for="cheque in CHEQUES"
                :key="cheque"
                class="flex flex-wrap gap-x-4 gap-y-1.5"
              >
                <LoansAgreementField :label="`Chèque n° ${cheque} – objet`" />
                <LoansAgreementField
                  label="Montant (€)"
                  short
                />
              </div>
            </template>
            <p
              v-else
              class="text-caption"
            >
              Aucune caution n’est demandée pour ce prêt.
            </p>
          </LoansAgreementSection>
          <LoansAgreementSection title="Engagements de l’emprunteur">
            <ul class="ml-5 flex list-disc flex-col gap-1 text-justify text-xs">
              <li
                v-for="engagement in ENGAGEMENTS"
                :key="engagement"
              >
                {{ engagement }}
              </li>
            </ul>
          </LoansAgreementSection>
          <div class="mt-4 flex flex-col gap-3">
            <div class="flex flex-wrap gap-x-4 gap-y-1.5">
              <LoansAgreementField label="Fait le" />
              <LoansAgreementField label="à" />
            </div>
            <div class="grid grid-cols-2 gap-5">
              <div
                v-for="signatory in ['du prêteur', 'de l’emprunteur']"
                :key="signatory"
                class="flex min-h-24 flex-col gap-1 rounded-lg border border-argent-300 p-2 text-center"
              >
                <p class="text-caption font-bold">
                  Signature {{ signatory }}
                </p>
                <p class="text-overline text-sable-600 italic">
                  (Faire précéder de la mention « Lu et approuvé »)
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
      <UiEmptyState v-else>
        Une réservation interne n’a pas de convention de prêt.
      </UiEmptyState>
    </template>
    <BoardLoadError
      v-else-if="error"
      :message="error.message"
      @retry="refresh()"
    />
  </div>
</template>
