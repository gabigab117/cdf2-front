<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import type { components } from '~/types/api'

type ManagementControlsOut = components['schemas']['ManagementControlsOut']

// « Contrôles » (D16): what the figures of the fiscal year still wait for, each
// with the way to it: purchases without a cost, purchases no expense paid,
// items not valued.
const { controls } = defineProps<{ controls: ManagementControlsOut }>()

const checks = computed(() =>
  [
    {
      key: 'unpriced',
      count: controls.unpriced_purchases,
      one: 'achat attend son prix : il compte au prix moyen d’ici là.',
      many: 'achats attendent leur prix : ils comptent au prix moyen d’ici là.',
      link: { to: UNPRICED_LOCATION, label: 'Compléter les prix' },
    },
    {
      key: 'unlinked',
      count: controls.unlinked_purchases,
      one: 'achat n’est payé par aucune dépense : rattachez-le depuis la page de sa dépense, par « Achat déjà saisi ».',
      many: 'achats ne sont payés par aucune dépense : rattachez-les depuis la page de leur dépense, par « Achat déjà saisi ».',
      link: null,
    },
    {
      key: 'unvalued',
      count: controls.unvalued_items,
      one: 'article n’est pas valorisé : donnez-lui un prix de départ.',
      many: 'articles ne sont pas valorisés : donnez-leur un prix de départ.',
      link: { to: STOCK_PATH, label: 'Voir le stock' },
    },
  ]
    .filter(check => check.count > 0)
    .map(({ count, one, many, ...check }) => ({ ...check, text: countText(count, one, many) })),
)
</script>

<template>
  <UiCard title="Contrôles">
    <template v-if="checks.length > 0">
      <UiCallout
        v-for="check in checks"
        :key="check.key"
        tone="ambre"
        :icon="TriangleAlert"
      >
        <p>{{ check.text }}</p>
        <template
          v-if="check.link"
          #actions
        >
          <UiButton
            variant="link"
            :to="check.link.to"
          >
            {{ check.link.label }}
          </UiButton>
        </template>
      </UiCallout>
    </template>
    <p
      v-else
      class="text-sm text-argent-600"
    >
      Rien n’attend : chaque achat a son prix et sa dépense, et chaque article est valorisé.
    </p>
  </UiCard>
</template>
