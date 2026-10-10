# Déploiement

Le front tourne sur le même VPS que l'API, derrière le même nginx, dans les mêmes instances (`preprod`, puis `prod`). L'organisation du serveur, le vhost nginx et les règles communes sont décrits dans [cdf2-back/deploy](https://github.com/gabigab117/cdf2-back/tree/main/deploy).

## Une release

- **Le serveur ne compile rien.** La CI construit le serveur Nitro (`.output`) et l'envoie sous forme d'archive `tar.gz` à [`release-front.sh`](release-front.sh). Le script est installé en `/usr/local/bin/cdf3-release-front`, propriété de root.
- **Appel par la CI** : par une clé SSH restreinte à cette seule commande.
- **Appel à la main** : `sudo -u cdf3 cdf3-release-front <instance> <sha> < output.tar.gz`.

Étapes :
1. **Réception de l'archive** : sa taille est plafonnée. Elle doit contenir `server/index.mjs`.
2. **Bascule atomique** du lien `current`, puis redémarrage du service.
3. **Contrôle de santé** : la page d'accueil doit répondre.
4. **Retour arrière** : en cas d'échec, retour automatique à la release précédente, dont la santé est vérifiée à son tour. Le statut renvoyé dit si le site est revenu. Les 3 dernières releases sont conservées.

## Déploiement continu

Un push sur `main` dont les contrôles passent se déploie seul, par le job `deploy` de [`ci.yml`](../.github/workflows/ci.yml).
- **Construction** : le job `checks` construit `.output` (ubuntu-24.04, Node 24), l'archive en `tar.gz` et la transmet en artefact au job `deploy`.
- **Envoi** : le job `deploy` passe l'archive sur l'entrée standard d'un `ssh` dont la clé ne peut lancer que le script de release :

  ```
  restrict,command="/usr/local/bin/cdf3-release-front <instance>" ssh-ed25519 AAAA… ci cdf2-front <instance>
  ```

Environnement GitHub, secrets, concurrence et rotation de la clé : mêmes règles que pour l'API, décrites dans [cdf2-back/deploy](https://github.com/gabigab117/cdf2-back/tree/main/deploy#déploiement-continu).

## Configuration

Le service lit `shared/front.env` (0600), qui reste hors du dépôt. Une variable modifiée prend effet au redémarrage suivant, par exemple à la prochaine release.

| Variable | Rôle |
|---|---|
| `NUXT_API_INTERNAL_URL` | Adresse de l'API pour le rendu serveur des pages publiques, sur le réseau local du serveur : `http://127.0.0.1:<port de l'API>`. Sans elle, un rendu serveur qui appelle l'API échoue. |
| `NUXT_PUBLIC_SITE_URL` | Adresse publique de l'instance (`https://…`), pour les adresses canoniques, Open Graph et l'abonnement à l'agenda. |
| `NUXT_PUBLIC_PREPROD` | `true` pour la préproduction seulement : bandeau « Préproduction — données fictives » et `noindex` sur chaque page. |
| `NUXT_PUBLIC_CONTACT_EMAIL`, `NUXT_PUBLIC_CONTACT_PHONE` | Coordonnées de l'association, jamais celles d'un membre. |
| `NUXT_PUBLIC_HALL_STREET`, `NUXT_PUBLIC_HALL_TOWN` | Adresse de la salle des fêtes. |
| `NUXT_LEGAL_PUBLICATION_DIRECTOR` | Directeur ou directrice de la publication, nommé par les mentions légales. |
| `NUXT_LEGAL_OFFICE_STREET`, `NUXT_LEGAL_OFFICE_TOWN` | Siège de l'association. |
| `NUXT_LEGAL_HOST_NAME`, `NUXT_LEGAL_HOST_ADDRESS`, `NUXT_LEGAL_HOST_PHONE` | Hébergeur du site : raison sociale, adresse et téléphone. |
| `NUXT_LEGAL_HOST_LOCATION` | Pays du serveur. |

Les variables `NUXT_PUBLIC_*` sont écrites dans chaque page servie : jamais de donnée personnelle. Les variables `NUXT_LEGAL_*` ne sont lues que par le rendu serveur des mentions légales, servies sans script.

Le contrôle de santé ne prouve pas que l'API est jointe : l'accueil répond même quand elle ne répond pas. Après un changement de configuration, on vérifie qu'un titre d'événement figure dans le HTML de l'accueil.

## Fichiers

| Fichier | Installé en | Rôle |
|---|---|---|
| `release-front.sh` | `/usr/local/bin/cdf3-release-front` | Release du front |
| `systemd/cdf3-web@.service` | `/etc/systemd/system/` | Serveur Nitro (Node 24), une instance par environnement (`cdf3-web@preprod`), écoute en local seulement. Durci : système en lecture seule, mémoire et CPU plafonnés |
