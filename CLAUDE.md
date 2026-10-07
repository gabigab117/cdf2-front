# CLAUDE.md — Frontend Comité des fêtes v2 (Nuxt 4)

Règles de développement de ce dépôt, pour les humains comme pour les agents. Elles couvrent tout ce qui touche au code du front. Le périmètre fonctionnel, la roadmap, la maquette et le workflow multi-dépôts vivent dans le dépôt de documentation du projet (privé). L'API Django Ninja est dans le dépôt `cdf2-back`.

## Conventions

- **Tout le code est en anglais** : fichiers, composants, composables, stores, variables, commentaires, messages de commit. **Seul ce que voit l'utilisateur final est en français** : textes d'UI, messages d'erreur affichés, URL des pages.
- **URL en français, fichiers en anglais** : le chemin d'une page se déclare par `definePageMeta({ path: '/bureau/prets/nouveau' })`, et son fichier garde un nom anglais (`pages/board/loans/new.vue`). Le vocabulaire suit le glossaire du projet : événement → `event`, prêt → `loan`, poste → `station`…
- Dates affichées comme dans la maquette (« sam. 31 oct. », « 1er », « 15 h 00 – 18 h 30 ») ou en JJ/MM/AAAA. Montants au format `1 234,50 €`. Les règles de format vivent dans des composables dédiés, jamais dans les templates.
- Conventional commits, directement sur `main`, historique linéaire.
- **Context7 avant tout code de librairie** : on vérifie l'API dans la documentation à jour (Context7, puis la doc officielle, puis `node_modules/`), jamais de mémoire. La stack bouge vite (Nuxt 4, vue-router 5, Tailwind 4).

## Outillage (obligatoire)

- **TypeScript strict**. Pas de `any` sauf justification commentée.
- **ESLint via `@nuxt/eslint`** (formatage `stylistic` compris, pas de Prettier), plus `eslint-plugin-better-tailwindcss` pour le tri des classes.
- **TypeScript reste en 5.x** (`~5.9.3`) : `openapi-typescript` dépend de l'API `ts.factory`, absente de TypeScript 7. Ne pas relever la majeure sans vérifier que la génération des types passe toujours.
- Node 24 LTS (`.nvmrc`).
- Le build ET le typecheck (`npm run typecheck`) doivent passer avant tout commit. La CI rejoue lint, typecheck, tests et build.

## Types API

- **Types générés depuis l'OpenAPI de Django Ninja** (`openapi.json` du back → `openapi-typescript`, via `npm run api:types`). Jamais d'interface API écrite à la main : le schéma du back est la source de vérité. La CI vérifie que les types commités correspondent au schéma du back.
- Régénérer les types à chaque évolution de l'API. Une tâche qui change l'API n'est terminée que quand le front compile avec les nouveaux types.
- **Un composable unique pour les appels API** (`useApi`, basé sur openapi-fetch), qui porte :
  - la base URL ;
  - le header `Authorization: Bearer <access>` ;
  - `credentials: 'include'` (le refresh token voyage en cookie httpOnly) ;
  - le **rejeu automatique de la requête après refresh sur 401** : une seule tentative, requêtes concurrentes mises en file derrière un unique refresh ;
  - la normalisation des erreurs : échec du refresh → redirection vers la connexion ; 422 → erreurs de validation de Ninja ramenées champ par champ sur le formulaire.

  Pas de `fetch`/`$fetch` éparpillés dans les composants.
- **Côté serveur (rendu des pages publiques), le composable ne porte aucun credential** : ni header `Authorization`, ni cookie relayé, ni refresh. Il n'y appelle que des endpoints publics, sur l'URL interne de l'API (runtimeConfig privée : une URL relative ne se résout pas côté serveur). Les données d'une page publique passent par `useAsyncData`, qui les transmet au client sans second appel.
- **L'access token vit en mémoire** (store Pinia), jamais dans `localStorage`/`sessionStorage` ni dans un cookie lisible par JS. La session se restaure par un refresh silencieux, tenté par le middleware à l'entrée de l'espace connecté (cf. Conventions Nuxt) : c'est ce qui la rétablit après un rechargement sans redemander le mot de passe. Jamais sur une page publique : un visiteur anonyme ne déclenche aucun appel d'authentification.
- **Fichiers protégés** : jamais un simple `<a href>`, car le navigateur n'enverrait pas le header `Authorization`.
  - On passe par le composable : `fetch` authentifié → blob.
  - Pour un téléchargement, on déclenche ensuite le téléchargement.
  - Pour une ouverture en ligne, l'URL blob est créée avec le **type renvoyé par le serveur**, jamais déduit côté client.
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
  - Un middleware global garde toute page qui ne s'est pas déclarée publique (`definePageMeta`) : sans access token en mémoire, il tente une fois le refresh silencieux, puis renvoie vers la connexion (`/connexion?redirect=`, chemins internes uniquement).
  - Une page publique se déclare, une page privée n'a rien à déclarer : un oubli ferme une page au lieu d'en ouvrir une.
  - Un bouton masqué ou une route gardée est de l'UX, jamais de la sécurité.
- **Espace privé sous `/bureau/**`**, réservé aux membres du bureau.
- État global : **Pinia**, stores par domaine (`useSessionStore`, puis par domaine métier au besoin). Pas d'état global improvisé dans des refs partagées : avec le rendu serveur, une ref de module serait partagée entre les requêtes de tous les visiteurs.
- **Pas de logique dans les templates** : extraire dans des `computed` ou des composables.

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
- Si une suite de classes apparaît 3 fois, c'est un composant Vue, pas une chaîne copiée-collée.
- `@apply` avec parcimonie (composants de base uniquement). CSS custom isolé et documenté (impression des pages A4, par exemple).

## Tests

- **Vitest + `@nuxt/test-utils`** pour les composables, les stores et les composants (`tests/**/*.spec.ts`, environnement `nuxt`). Les appels API se simulent avec `registerEndpoint`. Jamais de requête vers un vrai back dans un test unitaire.
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
- Ne pas tester ce que le framework garantit déjà. Ce qui mérite un test : les composables, les stores, l'affichage des états renvoyés par l'API.
- Données de test fictives uniquement : le dépôt est public.

## Definition of Done (chaque feature)

1. **Context7 consulté** pour chaque API de librairie utilisée ou modifiée : rien d'écrit de mémoire.
2. ESLint, `npm run typecheck` et `npm run build` passent.
3. **Vitest est vert**, et Playwright aussi si un parcours critique est touché.
4. Aucune interface API manuelle ; types régénérés (`npm run api:types`) si l'API a changé.
5. Aucune valeur Tailwind arbitraire ; classes récurrentes extraites en composants.
6. Pas de logique métier dans les templates ni de fetch hors du composable API.
7. Écran conforme à la maquette, ou, s'il en est absent, composé de ses tokens et composants et validé sur capture.
8. La CI est verte, et le déploiement en préproduction aussi.
9. La card correspondante de la roadmap est annotée **✅ Terminé**.
