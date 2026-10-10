<script setup lang="ts">
definePageMeta({ path: '/donnees-personnelles', public: true })

const { contact } = useRuntimeConfig().public

// How long each personal detail is kept (README, A9). A card that adds one, or
// changes how long one is kept, writes it here.
const RETENTION_PERIODS: ReadonlyArray<{ data: string, period: string }> = [
  {
    data: 'Compte d’un membre du bureau',
    period: 'Tant que la personne est au bureau. À son départ, le compte est désactivé, et son nom reste sur les événements qu’elle a menés, ses notes et ses tâches. Il est supprimé si elle le demande : ses notes et ses tâches restent, sans son nom.',
  },
  { data: 'Notes et tâches du bureau', period: 'Supprimées avec leur événement, ou à la main : une note par son auteur' },
  { data: 'Noms des bénévoles affectés aux postes', period: 'Effacés 2 ans après l’événement' },
  { data: 'Session de l’espace du bureau', period: '7 jours, puis effacée la nuit suivante' },
  { data: 'Session de l’administration des comptes', period: '2 semaines, puis effacée la nuit suivante' },
  { data: 'Compteurs de connexion', period: 'Effacés chaque nuit' },
  { data: 'Journal du serveur web', period: '14 jours' },
  { data: 'Journal de l’application', period: '7 jours' },
]

useSitePage({
  title: 'Données personnelles',
  description: 'Ce que le site du Comité des Fêtes d’Ons-en-Bray fait des données personnelles, combien de temps il les garde, et vos droits.',
})
</script>

<template>
  <SiteLegalPage title="Données personnelles">
    <p>
      Le {{ SITE_NAME }} est responsable des données que traite ce site. Elles restent sur son serveur, chez l’hébergeur nommé dans les
      <SiteTextLink
        :to="LEGAL_NOTICE_PATH"
        label="mentions légales"
      />, et ne sont transmises à personne.
    </p>
    <SiteLegalSection title="Visiteurs du site">
      <p>Le site ne dépose aucun cookie, ne mesure pas son audience et ne vous demande rien. Ses polices de caractères sont servies par le site lui-même.</p>
      <p>La carte d’un événement ne se charge que si vous cliquez dessus. OpenStreetMap reçoit alors votre adresse IP.</p>
      <p>Comme tout serveur web, le nôtre tient un journal technique des requêtes : adresse IP, date et heure, page demandée, navigateur. Il sert à la sécurité et au dépannage.</p>
    </SiteLegalSection>
    <SiteLegalSection title="Membres du bureau">
      <p>Chaque membre du bureau a un compte : e-mail, prénom, nom et fonction, avec un mot de passe qui n’est jamais conservé en clair. Le compte garde aussi sa date de création et celle de sa dernière connexion à l’administration.</p>
      <p>Les membres voient le nom et l’e-mail des autres membres. Un événement peut nommer son responsable parmi eux : ce lien n’est visible que du bureau, jamais publié sur le site.</p>
      <p>Les notes du bureau portent le nom de leur auteur, les tâches celui de la personne qui les a créées et de celle à qui elles sont assignées. Seul le bureau les lit. Ce sont des textes libres : on n’y écrit que le nécessaire, et aucune donnée sensible, comme une information de santé.</p>
      <p>La connexion à l’espace du bureau pose un cookie technique, indispensable pour rester connecté. L’administration des comptes pose aussi les siens : sa session et la protection de ses formulaires. Les connexions sont comptées par adresse IP, pour bloquer les essais de mots de passe.</p>
    </SiteLegalSection>
    <SiteLegalSection title="Bénévoles des événements">
      <p>Le bureau répartit les bénévoles sur les postes d’un événement : il note leur nom, et parfois leur rôle. Ces noms ne sont visibles que du bureau, jamais publiés sur le site, et ils sont effacés deux ans après l’événement.</p>
    </SiteLegalSection>
    <SiteLegalSection title="Durées de conservation">
      <table class="w-full text-left">
        <thead>
          <tr class="text-caption font-semibold tracking-overline text-argent-600 uppercase">
            <th
              scope="col"
              class="w-2/5 pr-6 pb-3 font-semibold"
            >
              Donnée
            </th>
            <th
              scope="col"
              class="pb-3 font-semibold"
            >
              Durée
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-argent-200 border-t border-argent-200">
          <tr
            v-for="row in RETENTION_PERIODS"
            :key="row.data"
          >
            <th
              scope="row"
              class="py-3 pr-6 align-top font-semibold text-sable-950"
            >
              {{ row.data }}
            </th>
            <td class="py-3 align-top">
              {{ row.period }}
            </td>
          </tr>
        </tbody>
      </table>
    </SiteLegalSection>
    <SiteLegalSection title="Vos droits">
      <p v-if="contact.email">
        Vous pouvez consulter, corriger ou effacer les données qui vous concernent, ou vous opposer à leur traitement, en écrivant à
        <SiteTextLink
          :to="`mailto:${contact.email}`"
          :label="contact.email"
        />.
      </p>
      <p v-else>
        Vous pouvez consulter, corriger ou effacer les données qui vous concernent, ou vous opposer à leur traitement, en écrivant au comité.
      </p>
      <p>
        Si la réponse ne vous satisfait pas, vous pouvez saisir la
        <SiteTextLink
          to="https://www.cnil.fr"
          label="CNIL"
        />.
      </p>
    </SiteLegalSection>
  </SiteLegalPage>
</template>
