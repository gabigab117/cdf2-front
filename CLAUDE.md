# CLAUDE.md — Frontend Comité des fêtes v2 (Nuxt 4)

Règles de développement de ce dépôt, pour les humains comme pour les agents. Elles couvrent tout ce qui touche au code du front. Le périmètre fonctionnel, la roadmap, la maquette et le workflow multi-dépôts vivent dans le dépôt de documentation du projet (privé). L'API Django Ninja est dans le dépôt `cdf2-back`.

## Conventions

- **Tout le code est en anglais** : fichiers, composants, composables, stores, variables, commentaires, messages de commit. **Seul ce que voit l'utilisateur final est en français** : textes d'UI, messages d'erreur affichés, URL des pages.
- **URL en français, fichiers en anglais** : le chemin d'une page se déclare par `definePageMeta({ path: '/bureau/prets/nouveau' })`, et son fichier garde un nom anglais (`pages/board/loans/new.vue`). Le vocabulaire suit le glossaire du projet : événement → `event`, prêt → `loan`, poste → `station`…
- Dates affichées comme dans la maquette (« sam. 31 oct. », « 1er », « 15 h 00 – 18 h 30 ») ou en JJ/MM/AAAA. Montants au format `1 234,50 €`. Les règles de format vivent dans des composables dédiés, jamais dans les templates.
  - **Dates : toujours à Paris**, quel que soit le fuseau du navigateur, avec `Intl` seul (la stack n'a pas de librairie de dates, et Temporal n'existe pas dans Node 24).
  - `useDateFormat()` écrit les formats de la maquette. Les espaces d'une heure sont insécables.
  - `utils/paris-time.ts` passe d'un champ `datetime-local` à un instant ISO avec le décalage de Paris, et retour : l'API refuse une date sans fuseau.
  - Un formulaire ne renvoie jamais une date qu'il n'édite pas en la relisant dans un champ : elle perdrait ses secondes. Il la renvoie telle que l'API l'a donnée.
- Conventional commits, directement sur `main`, historique linéaire.
- **Context7 avant tout code de librairie** : on vérifie l'API dans la documentation à jour (Context7, puis la doc officielle, puis `node_modules/`), jamais de mémoire. La stack bouge vite (Nuxt 4, vue-router 5, Tailwind 4).

## Outillage (obligatoire)

- **TypeScript strict**. Pas de `any` sauf justification commentée.
- **ESLint via `@nuxt/eslint`** (formatage `stylistic` compris, pas de Prettier), plus `eslint-plugin-better-tailwindcss` pour le tri des classes.
- **TypeScript reste en 5.x** (`~5.9.3`) : `openapi-typescript` dépend de l'API `ts.factory`, absente de TypeScript 7. Ne pas relever la majeure sans vérifier que la génération des types passe toujours.
- Node 24 LTS (`.nvmrc`).
- Le build ET le typecheck (`npm run typecheck`) doivent passer avant tout commit. La CI rejoue lint, typecheck, tests et build.

## Types API

- **Types générés depuis l'OpenAPI de Django Ninja** (`openapi.json` du back → `openapi-typescript`, via `npm run api:types`), dans `app/types/api.d.ts`, commité et exclu d'ESLint. Jamais d'interface API écrite à la main : le schéma du back est la source de vérité.
  - Le script lit le dépôt du back voisin (`../back/openapi.json`) ; la variable `API_SCHEMA` désigne un autre fichier.
  - Le job CI `api-types` vérifie que les types commités correspondent au schéma de `main` côté back (`--check` d'openapi-typescript), et le déploiement l'attend. Une évolution de l'API se pousse donc d'abord dans le back.
- Régénérer les types à chaque évolution de l'API. Une tâche qui change l'API n'est terminée que quand le front compile avec les nouveaux types.
- **Un composable unique pour les appels API** (`useApi`, basé sur openapi-fetch), qui porte :
  - la base URL ;
  - le header `Authorization: Bearer <access>` ;
  - `credentials: 'include'` (le refresh token voyage en cookie httpOnly) ;
  - le **rejeu automatique de la requête après refresh sur 401** : une seule tentative, requêtes concurrentes mises en file derrière un unique refresh ;
  - la normalisation des erreurs : échec du refresh → redirection vers la connexion ; 422 → erreurs de validation de Ninja ramenées champ par champ sur le formulaire.

  Pas de `fetch`/`$fetch` éparpillés dans les composants.
- **Mise en œuvre** : `plugins/api.client.ts` (client du navigateur et middleware de session), `plugins/api.server.ts` (client du rendu serveur), store `session` (`stores/session.ts`), `middleware/auth.global.ts`, `utils/api-errors.ts`, `utils/sign-in.ts`, `utils/files.ts`.
  - Un 401 ne déclenche un refresh que si la requête portait le jeton courant de la session. Sans jeton envoyé, ou une fois la session close, le refus est rendu tel quel : restaurer une session est le travail du middleware de route.
  - Les opérations de session (`login`, `refresh`, `logout`) ne sont jamais rejouées : un 401 du refresh attendrait sinon sa propre réponse.
  - Le refresh passe sous un verrou partagé par les onglets (`navigator.locks`) : chaque refresh consomme le cookie, que les onglets partagent.
  - `renew()` ne se résout que sur une issue définitive (`'renewed'`, ou `'ended'` sur un 401 ou un 403). Un 429 ou un 5xx lève une `SessionRenewalError` (`retryAfter`), une coupure réseau son erreur : ni l'un ni l'autre ne déconnecte.
  - `toFormErrors()` place les erreurs d'un 422 sur les champs. Il suppose que le corps JSON de chaque opération s'appelle `payload`, convention du back.
  - `placeErrors()` garde sous ses champs les erreurs des champs qu'un formulaire affiche, et passe les autres sur le formulaire, après le nom de leur champ : aucune ne se perd.
  - `loadData()` est le handler d'un `useAsyncData` : il renvoie `data`, ou lève une erreur qui porte le statut de la réponse (503 sans réponse) et le message à afficher.
  - `errorMessage()` donne le message à afficher pour une requête qui a échoué : le `detail` d'un refus de l'API, rédigé pour le membre, ou un repli en français (réseau, 5xx, 429). Le corps d'une erreur serveur n'est jamais affiché.
  - `signIn()` renvoie les erreurs à poser sur le formulaire ; `signOut()` garde la session si le serveur n'a pas pu la fermer, car le cookie de refresh connecterait sinon encore ce navigateur.
- **Côté serveur (rendu des pages publiques), le composable ne porte aucun credential** : ni header `Authorization`, ni cookie relayé, ni refresh. Il n'y appelle que des endpoints publics, sur l'URL interne de l'API (runtimeConfig privée : une URL relative ne se résout pas côté serveur). Les données d'une page publique passent par `useAsyncData`, qui les transmet au client sans second appel : le handler renvoie `data` seul, car un `Response` ne passe pas dans le payload. L'URL interne vient de `NUXT_API_INTERNAL_URL`, sans valeur par défaut.
- **L'access token vit en mémoire** (store Pinia), jamais dans `localStorage`/`sessionStorage` ni dans un cookie lisible par JS. La session se restaure par un refresh silencieux, tenté par le middleware à l'entrée de l'espace connecté (cf. Conventions Nuxt) : c'est ce qui la rétablit après un rechargement sans redemander le mot de passe. Jamais sur une page publique : un visiteur anonyme ne déclenche aucun appel d'authentification.
- **Fichiers protégés** : jamais un simple `<a href>`, car le navigateur n'enverrait pas le header `Authorization`.
  - On passe par le composable : `fetch` authentifié → blob (`parseAs: 'blob'`), confié à `downloadFile()` ou `openFile()` (`utils/files.ts`).
  - Pour un téléchargement, on déclenche ensuite le téléchargement.
  - Pour une ouverture en ligne, l'URL blob est créée avec le **type renvoyé par le serveur**, jamais déduit côté client.
    - L'onglet s'ouvre dans le clic, avant l'arrivée du fichier : `openFile()` s'appelle avant tout `await` du gestionnaire, sinon le navigateur bloque l'onglet comme pop-up.
    - Seuls PDF, JPEG et PNG s'ouvrent en ligne ; tout autre type est téléchargé.
  - L'URL blob est libérée après usage.
- **Aucune logique d'autorisation ou de règle métier côté client** : le front affiche les états renvoyés par l'API, il ne les décide jamais (disponibilités, statuts de prêt, totaux de trésorerie). Le rôle exposé par « qui suis-je » sert à adapter la navigation : c'est de l'UX, pas de la sécurité.

## Conventions Nuxt

- Respecter les conventions du framework : auto-imports, pas de réinvention de la roue.
- `components/` découpés par domaine métier (`events/`, `stations/`, `loans/`, `treasury/`…), plus `ui/` pour les composants de base du système visuel.
- `composables/` : préfixe `use*`, une responsabilité chacun.
- `plugins/` pour les **intégrations globales uniquement** : ce qui doit exister avant le premier rendu ou s'appliquer à toute l'app (client API partagé, gestionnaire d'erreurs global).
  - Un plugin est un point d'entrée d'infrastructure, pas un fourre-tout. Toute logique réutilisable appelée depuis des composants est un composable ; toute règle de navigation est un middleware.
  - Nommer explicitement (`api.ts`, `errors.ts`).
  - **Avec le rendu serveur, le suffixe `.client.ts` n'est plus documentaire** : sans lui, un plugin s'exécute aussi pendant le rendu serveur. Tout ce qui touche au navigateur ou à la session le porte.
- `middleware/` : **privé par défaut**.
  - Un middleware global (`auth.global.ts`) garde toute page qui ne s'est pas déclarée publique (`definePageMeta({ public: true })`, typé dans `types/page-meta.d.ts`) : sans access token en mémoire, il tente une fois le refresh silencieux, puis renvoie vers la connexion (`/connexion?redirect=`, chemins internes uniquement, `safeRedirect()`).
  - Une page publique se déclare, une page privée n'a rien à déclarer : un oubli ferme une page au lieu d'en ouvrir une.
  - Une adresse inconnue n'est pas une page : elle va au 404, pas à la connexion.
  - Un renouvellement qui échoue pour l'instant (429, 5xx, réseau) affiche la page d'erreur avec « Réessayer », sans renvoyer à la connexion.
  - La page de connexion n'est liée nulle part : les membres l'ouvrent depuis leur favori. Une session encore ouverte la traverse donc tout droit, après un refresh silencieux.
  - Un bouton masqué ou une route gardée est de l'UX, jamais de la sécurité.
- **Espace privé sous `/bureau/**`**, réservé aux membres du bureau.
- **Layouts** :
  - `default` : le site public, en-tête et pied de page. Ses liens arrivent avec les pages qu'ils visent. Aucun lien vers l'espace bureau.
  - `board` : barre latérale, barre supérieure, tiroir sous 820 px. Posé sur `/bureau/**` par `routeRules` (`appLayout`).
  - `standalone` : une page hors du site public, la connexion et la page d'erreur (`error.vue`).
- Icônes : `@lucide/vue`, l'équivalent le plus proche de celles de la maquette. Le trait de 1,8 de la maquette est fourni à toute l'application par `plugins/icons.ts`.
- **Option d'invite d'un `UiSelect`** (« Choisir une catégorie ») : une option à valeur vide **statique**. Liée à `null`, Vue retirerait son attribut `value`, et un `required` laisserait passer la liste sans choix.
- État global : **Pinia**, stores par domaine (`useSessionStore`, puis par domaine métier au besoin). Pas d'état global improvisé dans des refs partagées : avec le rendu serveur, une ref de module serait partagée entre les requêtes de tous les visiteurs.
- **Données de l'API : `useAsyncData`**, avec une clé explicite.
  - Des composants partagent une donnée par sa clé, déclarée dans **un seul composable** (`useUpcomingEvents`, `useBoardEvent`). Nuxt garde le handler du premier appelant : deux handlers pour une clé, c'est une donnée fausse.
  - Quand plusieurs composants montent en même temps, `dedupe: 'defer'` leur fait attendre la requête en cours, au lieu de l'annuler pour la leur.
  - `data` n'est pas profond : on le remplace, on ne le modifie jamais.
  - Après une écriture, la donnée qu'elle change se recharge par sa clé (`refreshNuxtData`). Toute écriture d'un événement recharge la barre latérale (`useEventWrites`).
  - Une donnée qu'une seule page lit (le tableau de bord) n'a pas de rechargement à prévoir après une écriture faite sur une autre page : Nuxt purge la donnée d'une clé au démontage de son dernier composant, `refreshNuxtData` n'atteint que les clés montées, et la page la relit à sa prochaine visite.
  - Les compteurs des onglets d'un événement viennent de son tableau de bord (`useEventDashboard`) : toute écriture d'un onglet le recharge (`refreshEventDashboard`), jamais un compte fait côté client.
  - **L'onglet d'une page vit dans l'adresse** (`?onglet=…&page=…`, `utils/event-tabs.ts`) : un lien y mène, la pagination d'un onglet passe par des liens, et Nuxt ne remonte pas la page quand seule la requête change.
  - Dans les tests, les composants se démontent avant `clearNuxtData()` : sinon, une réponse en vol réécrit les données vidées.
- **Pas de logique dans les templates** : extraire dans des `computed` ou des composables.
- **Un lien dans un texte** (`SiteTextLink`) reçoit son texte en propriété, pas dans un slot : le linter met le contenu d'un composant sur ses propres lignes, et le lien finirait par un espace, avant la virgule ou le point qui le suit.
- **Pas de commentaire HTML à la racine d'un template** : il en fait un fragment, et les attributs passés au composant ne tombent plus sur son élément (constaté sur `UiButton`). Le commentaire va dans le script, ou hors du `<template>`.
- **Un lien vers la page affichée est toujours « actif » pour le routeur**, quelle que soit sa requête ou son ancre : vue-router ignore les deux et lui pose `aria-current="page"`. Un lien vers la même page avec une autre requête (chip de filtre, pagination, ancre du site) lie donc `aria-current` lui-même (`UiFilterChip`, `UiButton`, `SiteNav`). L'environnement de test ne marque aucun lien : seul le HTML rendu le prouve (parcours E2E).

## Rendu hybride (décision projet)

Le site a des pages publiques indexables et un espace connecté. Chacun reçoit son mode de rendu par `routeRules` dans `nuxt.config.ts`.

- **Pages publiques : rendu serveur (SSR), impersonnel.**
  - Aucun credential dans un rendu serveur : ni access token, ni cookie relayé, seulement des endpoints publics du back (`/api/public/`, schémas dédiés sans donnée personnelle).
  - Le HTML rendu est le même pour tous les visiteurs.
  - Chaque page publique déclare ses métadonnées (`useSeoMeta`).
  - **Aucune donnée personnelle sur une page publique.** Seule exception : les mentions légales, qui nomment le directeur de publication (obligation légale).
- Ce qui dépend de la session (lien vers l'espace, nom du membre…) ne s'affiche que côté client, et seulement si une session existe déjà en mémoire. Jamais dans le rendu serveur.
- **Espace connecté : CSR** (`ssr: false` sur `/bureau/**`). Le serveur n'y rend qu'une coquille ; la session n'existe que dans le navigateur.
- **Production** : `nuxt build` produit un serveur Nitro (Node, piloté par systemd) derrière nginx, qui envoie `/api/` à Django et le reste à Nitro.
  - La CI construit `.output` et le déploie en release.
  - Pas de SPA statique (`nuxt generate`) : les pages publiques affichent des données vivantes.
  - En dev, le `devProxy` de Nitro tient le rôle de nginx : le navigateur ne voit qu'une origine, comme en prod.
- Les coordonnées du comité et le drapeau de préproduction viennent de `runtimeConfig`, alimentée par l'environnement : aucune donnée réelle dans le dépôt, qui est public.
  - **`runtimeConfig.public` est écrite dans chaque page servie**, pour le navigateur : jamais une donnée personnelle. Ce qu'une seule page doit montrer reste en clé privée, lue par son rendu serveur.
  - **Une page qui lit une clé privée est servie sans script** (`noScripts` dans `routeRules`, comme `/mentions-legales`). Nuxt n'y écrit ni script ni payload, et le routeur du navigateur remplace toute navigation vers elle par un chargement complet : seul le serveur la rend. Son chemin s'écrit en toutes lettres dans la règle et dans son `definePageMeta`. Écartés, ils feraient monter au navigateur le bouchon de la page, qui la recharge sans fin.
- **Une page publique se lit sans JavaScript**, son contenu comme sa navigation.
  - Un filtre est un lien. Un menu est un `popover` natif (`UiPopover`), qui s'ouvre et se ferme sans script.
  - Ce qui ne peut pas marcher sans script ne s'affiche que dans le navigateur (`<ClientOnly>`) : pas de bouton mort.
  - Aucun service tiers n'est appelé sans une action du visiteur : la carte d'OpenStreetMap se charge au clic.
- **« Maintenant » se lit une fois par rendu** (`useNow()`, sur `useState`) : un compte à rebours ou une saison donne le même texte au serveur et à l'hydratation, même à minuit.
- **Une page publique répond même quand l'API ne répond pas.**
  - Ses lectures ont un délai (`PUBLIC_API_TIMEOUT`, option `timeout` de `useAsyncData`).
  - L'accueil remplace l'agenda par un message et répond 200 : le contrôle de santé du déploiement et l'attente des parcours E2E appellent `/`, et un 503 y ferait échouer l'un comme l'autre.
  - Une fiche introuvable est un 404 ; l'API hors d'atteinte, un 503 qui propose de réessayer.

## Design : la maquette

- **Référence visuelle et fonctionnelle : la maquette du projet** (écrans et tokens Tailwind), versionnée avec la roadmap. Elle fait foi pour la mise en page, les textes, les couleurs et le comportement des écrans.
- Elle se traduit en tokens Tailwind et en composants Vue. Aucun HTML ni JS de maquette n'est repris tel quel, et aucun style inline n'est recopié.
- **Écrans absents de la maquette** (connexion, formulaires, onglets, menus mobiles…) : composés uniquement à partir des tokens et des composants existants.
- Mobile-first.
- En cas d'écart entre une card de la roadmap et la maquette, **le signaler** avant de coder.

## CSS : Tailwind v4

- **Tailwind v4, piloté par le CSS.** Ni `tailwind.config.js` ni `theme.extend` : le plugin `@tailwindcss/vite` est branché dans `nuxt.config.ts`, et les tokens vivent dans le bloc `@theme` de `app/assets/css/main.css`.
- **Tokens d'abord, et seulement des tokens** : couleurs, tailles de texte, rayons et polices sont définis une seule fois dans ce `@theme`.
  - Une valeur exacte de la maquette (texte de 14,5 px, rayon de 18 px, couleur hors palette) devient un **token nommé**.
  - **Aucune valeur arbitraire** (`text-[14.5px]`, `text-[#a33]`).
- L'échelle d'espacements reste celle de Tailwind (base `0.25rem`).
- Deux règles ESLint tiennent la discipline : `enforce-consistent-class-order` et `no-unknown-classes`.
  - Elles lisent aussi les valeurs d'un objet nommé `classes`, où un composant de base range ses variantes (`components/ui/`).
- **Un seul point de rupture**, celui de la maquette : `md` vaut 820 px. En dessous, la barre latérale devient un tiroir et les colonnes secondaires disparaissent.
- Les états que la maquette ne dessine pas sont composés : un focus visible global (contour azur, celui de l'interrupteur de Photos) et un survol par composant.
- Si une suite de classes apparaît 3 fois, c'est un composant Vue, pas une chaîne copiée-collée.
- `@apply` avec parcimonie (composants de base uniquement). CSS custom isolé et documenté (impression des pages A4, par exemple).

## Tests

- **Vitest + `@nuxt/test-utils`** pour les composables, les stores et les composants (environnement `nuxt`).
  - Les tests vivent dans `tests/nuxt/`, en miroir de `app/`. C'est le seul dossier de tests que la configuration TypeScript de Nuxt vérifie.
  - Les appels API se simulent avec `registerEndpoint`, par le helper `mockApi()` (`tests/nuxt/helpers/api.ts`). openapi-fetch passe à `fetch` un `Request`, dont l'URL est absolue : le mock est enregistré sous cette URL.
  - Jamais de requête vers un vrai back dans un test unitaire.
  - La configuration du test vient de `vitest.config.ts` (`environmentOptions.nuxt.overrides.runtimeConfig`), avec des valeurs fictives, clés privées comprises. Un test qui la change la rétablit.
  - Une page servie sans script se monte avec `route: false` : naviguer vers elle déclencherait le chargement de page du routeur. Son câblage se vérifie sans naviguer (`getRouteRules()`).
  - `useRuntimeConfig()`, `useNow()` et les autres composables ne s'appellent que dans un test, jamais au niveau du module : l'application n'existe pas encore à l'import.
  - happy-dom ne connaît pas l'API Popover : un test vérifie le câblage (`popovertarget`, `popovertargetaction`), l'ouverture se vérifie sur capture ou en E2E.
  - **Choisir l'option d'une liste à valeurs numériques** : `setValue('7')`, en texte. happy-dom compare la valeur d'une option à un nombre sans la convertir : `setValue(7)` ne choisit rien, et le modèle passe à `undefined`.
- **Playwright** pour les parcours critiques uniquement (`e2e/`), **contre un vrai back Django**. Les parcours critiques sont :
  - connexion, déconnexion et rechargement en cours de session ;
  - **une page publique chargée JavaScript désactivé** : la preuve que son contenu est rendu côté serveur, donc indexable ;
  - création d'un prêt en conflit de disponibilité ;
  - saisie d'une écriture avec justificatif ;
  - validation d'un document ;
  - affectation d'un bénévole à un poste.
- **Les parcours tournent en mode dev** (`dev: true` dans `playwright.config.ts`).
  - Seul `nuxt dev` applique le proxy `/api` qui place l'API sur l'origine du front. C'est la topologie de production, où nginx tient ce rôle ; le serveur Nitro produit par `nuxt build` n'a, lui, aucun proxy.
  - Les prérequis d'exécution sont dans le README.
  - Playwright démarre le back (`webServer`, dossier `E2E_BACK_DIR`, `../back` par défaut). `e2e/global-setup.ts` y charge un membre du bureau fictif (`e2e/fixtures/board-member.json`), repéré par son e-mail : le recharger met à jour le même compte. Il y écrit aussi les événements fictifs de la maquette (`manage.py seed_demo`, permis pour ce seul appel).
  - Le serveur de dev reçoit sa configuration de `playwright.config.ts` (`use.nuxt.env`) : l'API des parcours pour le rendu serveur, et une préproduction fictive.
  - Les dates de la démonstration suivent le jour où elle s'écrit : un parcours retrouve un événement par son nom, jamais par sa place.
  - Un parcours qui écrit (un poste sur Halloween) nettoie d'abord ce qu'un essai interrompu a laissé, une fois la donnée chargée, en attendant après chaque suppression que la liste l'ait perdue : une relance de la CI repart de la même base.
  - Une page lue sans JavaScript se charge par `page.goto` : le `goto` qui attend l'hydratation ne rendrait jamais la main.
  - L'API limite les connexions à 5 par minute et par IP, et tous les navigateurs de la suite partagent celle du proxy. Un parcours ne se connecte donc qu'une fois, le refus des identifiants une autre, avec une seule relance en CI.
  - Le job `e2e` de la CI rejoue les parcours contre la branche `main` du back, et le déploiement l'attend.
- Ne pas tester ce que le framework garantit déjà. Ce qui mérite un test : les composables, les stores, l'affichage des états renvoyés par l'API, et le comportement des composants de base (bornes, liaisons ARIA, événements), jamais leurs variantes visuelles.
- Données de test fictives uniquement : le dépôt est public.

## Definition of Done (chaque feature)

1. **Context7 consulté** pour chaque API de librairie utilisée ou modifiée : rien d'écrit de mémoire.
2. ESLint, `npm run typecheck` et `npm run build` passent.
3. **Vitest est vert**, et Playwright aussi si un parcours critique est touché.
4. Aucune interface API manuelle ; types régénérés (`npm run api:types`) si l'API a changé.
5. Aucune valeur Tailwind arbitraire ; classes récurrentes extraites en composants.
6. Pas de logique métier dans les templates ni de fetch hors du composable API.
7. Écran conforme à la maquette, ou, s'il en est absent, composé de ses tokens et composants et validé sur capture.
8. Une donnée personnelle ajoutée, ou une durée de conservation changée, est décrite sur la page « Données personnelles » (`pages/privacy.vue`).
9. La CI est verte, et le déploiement en préproduction aussi.
10. La card correspondante de la roadmap est annotée **✅ Terminé**.
