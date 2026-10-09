# Comité des fêtes d'Ons-en-Bray — Front

[![CI](https://github.com/gabigab117/cdf2-front/actions/workflows/ci.yml/badge.svg)](https://github.com/gabigab117/cdf2-front/actions/workflows/ci.yml)

Front de la v2 de l'application du Comité des fêtes d'Ons-en-Bray (Oise), une association qui organise les animations de la commune. L'application regroupe deux parties :
- un **site public** : agenda des manifestations, fiches événements, souvenirs ;
- un **espace réservé au bureau** (`/bureau`) : organisation des événements et des bénévoles, documents, trésorerie, stock de la buvette, prêts de matériel aux associations du village.

Ce dépôt contient le front. L'API (Django Ninja) est dans [cdf2-back](https://github.com/gabigab117/cdf2-back).

> **État** : projet en cours de construction (octobre 2026). Le site public (accueil, agenda, fiches des événements) et la gestion des événements par le bureau sont en place ; les autres écrans arrivent par étapes.

## Stack

- **Nuxt 4**, Vue 3, **TypeScript** strict (5.9, épinglé : la génération des types d'API dépend de la 5.x)
- **Tailwind CSS 4**, piloté par le CSS : les tokens du système visuel vivent dans le bloc `@theme` de [`app/assets/css/main.css`](app/assets/css/main.css)
- **Pinia**, **@nuxt/fonts** (polices auto-hébergées, aucun appel à un service tiers côté visiteur), **@lucide/vue** (icônes au trait, embarquées une à une dans le build)
- **openapi-typescript** (types de l'API générés) et **openapi-fetch** (client typé)
- Qualité : **ESLint** (`@nuxt/eslint` avec règles stylistiques, `eslint-plugin-better-tailwindcss`), **Vitest** et `@nuxt/test-utils`, **Playwright**
- Node **24 LTS**

## Principes

- **Rendu hybride.**
  - Les pages publiques sont rendues côté serveur (SSR). Elles sont indexables, lisibles sans JavaScript et ne portent aucune donnée de session ni aucune donnée personnelle.
  - L'espace `/bureau` est une application côté client (`routeRules`). Sa session n'existe que dans le navigateur.
- **Un site public complet sans JavaScript.**
  - Les filtres de l'agenda sont des liens.
  - Le menu du téléphone est un `popover` natif du navigateur.
  - Ce qui ne peut pas marcher sans script, comme « Partager », n'est rendu que dans le navigateur.
  - La carte d'OpenStreetMap ne se charge qu'au clic du visiteur : aucun service tiers n'est appelé sans son action.
  - Si l'API ne répond pas, l'accueil s'affiche quand même, avec un message à la place de l'agenda.
- **Une seule origine.** L'API est servie sous `/api` par le même domaine : par nginx en production, par le proxy de développement de Nitro en local. Il n'y a donc pas de CORS.
- **Contrat d'API généré.** Les types TypeScript de l'API sont générés depuis le schéma OpenAPI du back et commités dans `app/types/api.d.ts`. Aucune interface n'est écrite à la main.
  - La CI vérifie que ces types correspondent au schéma de la branche `main` du back.
  - Une évolution de l'API se pousse donc d'abord dans le back, puis dans le front avec ses types régénérés.
- **Un seul client d'API** (`useApi`, sur openapi-fetch).
  - Dans le navigateur, il porte la session du membre du bureau : l'access token reste en mémoire, jamais dans le stockage du navigateur, et le refresh token voyage dans un cookie httpOnly.
  - Un access token expiré est renouvelé une seule fois pour toutes les requêtes en attente, onglets compris, puis la requête est rejouée.
  - Côté serveur, le client ne porte aucun credential et joint l'API par son adresse interne.
- **Système visuel par tokens.** Couleurs, tailles et rayons de la maquette sont définis une fois, dans `@theme`. Aucune valeur arbitraire n'apparaît dans les classes, et l'ESLint refuse les classes inconnues.
- **URL en français, code en anglais.** Une page déclare son chemin public avec `definePageMeta({ path })`.
- **Privé par défaut.** Un middleware global réserve au bureau toute page qui ne se déclare pas publique (`definePageMeta({ public: true })`).
  - Il restaure la session par un renouvellement silencieux, puis renvoie à la page de connexion si elle a pris fin.
  - La page de connexion (`/connexion`) n'est liée nulle part sur le site public : les membres du bureau la reçoivent, et la gardent en favori.

## Démarrage local

Prérequis : Node 24 (`.nvmrc`) et, pour les appels d'API, le back démarré sur `127.0.0.1:8000` (`manage.py runserver`).

```bash
npm ci
cp .env.example .env   # adresse de l'API pour le rendu serveur, configuration du site
npm run dev            # http://localhost:3000, /api relayé vers le back
```

Pour remplir l'agenda d'événements fictifs, le back les écrit avec `manage.py seed_demo` (voir son README).

## Configuration

Toute la configuration vient de l'environnement (`.env` en local) : le dépôt ne contient aucune valeur réelle.

| Variable | Rôle |
|---|---|
| `NUXT_API_INTERNAL_URL` | Adresse de l'API pour le rendu serveur, sur le réseau du serveur. Obligatoire dès qu'une page publique lit l'API. |
| `NUXT_PUBLIC_SITE_URL` | Adresse du site (`https://…`) : adresses canoniques, Open Graph, abonnement à l'agenda (`webcal://`). |
| `NUXT_PUBLIC_PREPROD` | `true` en préproduction : bandeau « Préproduction — données fictives » et pages jamais indexées. |
| `NUXT_PUBLIC_CONTACT_EMAIL`, `NUXT_PUBLIC_CONTACT_PHONE` | E-mail et téléphone de l'association, jamais ceux d'un membre. |
| `NUXT_PUBLIC_HALL_STREET`, `NUXT_PUBLIC_HALL_TOWN` | Adresse de la salle des fêtes, puis son code postal et sa commune. |

Les variables `NUXT_PUBLIC_*` sont écrites dans chaque page servie, pour le navigateur : elles ne contiennent jamais de donnée personnelle. Une valeur vide masque la ligne qu'elle remplit.

## Qualité

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint : code, formatage, ordre et validité des classes Tailwind |
| `npm run typecheck` | Vérification TypeScript (application, tests, parcours E2E) |
| `npm run test` | Tests unitaires Vitest (environnement Nuxt), dans `tests/nuxt/` |
| `npm run test:e2e` | Parcours critiques Playwright, dans `e2e/`, contre le vrai back (voir plus bas) |
| `npm run build` | Build de production (serveur Nitro dans `.output/`) |
| `npm run api:types` | Types de l'API, générés depuis le schéma du back voisin (`../back/openapi.json`, ou le fichier désigné par `API_SCHEMA`) |

## Parcours de bout en bout

Les parcours critiques tournent dans Chromium, contre le vrai back. Le front y tourne en mode développement : seul `nuxt dev` sert l'API sur sa propre origine, comme nginx en production.

Prérequis :
- le dépôt du back à côté de celui-ci (`../back`), ou ailleurs, désigné par `E2E_BACK_DIR` ;
- son environnement installé (`uv sync`) et son `.env` renseigné (PostgreSQL) ;
- le navigateur de Playwright : `npx playwright install chromium`.

```bash
npm run test:e2e
```

- Playwright démarre le back sur `127.0.0.1:8000`, ou réutilise celui qui y tourne déjà.
- Il prépare la base du back, en local celle de développement :
  - il applique les migrations et crée la table de cache ;
  - il charge un membre du bureau fictif (`e2e/fixtures/board-member.json`), repéré par son adresse e-mail : le recharger met à jour le même compte ;
  - il écrit les événements fictifs de la maquette (`manage.py seed_demo`), que les pages publiques montrent.
- Le front rend ses pages publiques avec ce back, comme une préproduction. Les parcours du site les lisent sans JavaScript : ce que le serveur écrit est tout ce qu'un moteur de recherche lit.

## Licence

[MIT](LICENSE)
