# Comité des fêtes d'Ons-en-Bray — Front

Front de la v2 de l'application du Comité des fêtes d'Ons-en-Bray (Oise), une association qui organise les animations de la commune. L'application regroupe deux parties :
- un **site public** : agenda des manifestations, fiches événements, souvenirs ;
- un **espace réservé au bureau** (`/bureau`) : organisation des événements et des bénévoles, documents, trésorerie, stock de la buvette, prêts de matériel aux associations du village.

Ce dépôt contient le front. L'API (Django Ninja) est dans [cdf2-back](https://github.com/gabigab117/cdf2-back).

> **État** : projet en cours de construction (octobre 2026). Le socle technique est en place ; les écrans arrivent par étapes.

## Stack

- **Nuxt 4**, Vue 3, **TypeScript** strict (5.9, épinglé : la génération des types d'API dépend de la 5.x)
- **Tailwind CSS 4**, piloté par le CSS : les tokens du système visuel vivent dans le bloc `@theme` de [`app/assets/css/main.css`](app/assets/css/main.css)
- **Pinia**, **@nuxt/fonts** (polices auto-hébergées, aucun appel à un service tiers côté visiteur)
- Qualité : **ESLint** (`@nuxt/eslint` avec règles stylistiques, `eslint-plugin-better-tailwindcss`), **Vitest** et `@nuxt/test-utils`, **Playwright**
- Node **24 LTS**

## Principes

- **Rendu hybride.**
  - Les pages publiques sont rendues côté serveur (SSR). Elles sont indexables, lisibles sans JavaScript et ne portent aucune donnée de session ni aucune donnée personnelle.
  - L'espace `/bureau` est une application côté client (`routeRules`). Sa session n'existe que dans le navigateur.
- **Une seule origine.** L'API est servie sous `/api` par le même domaine : par nginx en production, par le proxy de développement de Nitro en local. Il n'y a donc pas de CORS.
- **Contrat d'API généré.** Les types TypeScript de l'API sont générés depuis le schéma OpenAPI du back. Aucune interface n'est écrite à la main.
- **Système visuel par tokens.** Couleurs, tailles et rayons de la maquette sont définis une fois, dans `@theme`. Aucune valeur arbitraire n'apparaît dans les classes, et l'ESLint refuse les classes inconnues.
- **URL en français, code en anglais.** Une page déclare son chemin public avec `definePageMeta({ path })`.

## Démarrage local

Prérequis : Node 24 (`.nvmrc`) et, pour les appels d'API, le back démarré sur `localhost:8000`.

```bash
npm ci
npm run dev        # http://localhost:3000, /api relayé vers le back
```

## Qualité

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint : code, formatage, ordre et validité des classes Tailwind |
| `npm run typecheck` | Vérification TypeScript (application et tests) |
| `npm run test` | Tests unitaires Vitest (environnement Nuxt), dans `tests/nuxt/` |
| `npm run build` | Build de production (serveur Nitro dans `.output/`) |

## Licence

[MIT](LICENSE)
