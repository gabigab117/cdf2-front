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
4. **Retour arrière** : en cas d'échec, retour automatique à la release précédente. Les 3 dernières sont conservées.

## Déploiement continu

Un push sur `main` dont les contrôles passent se déploie seul, par le job `deploy` de [`ci.yml`](../.github/workflows/ci.yml).
- **Construction** : le job `checks` construit `.output` (ubuntu-24.04, Node 24), l'archive en `tar.gz` et la transmet en artefact au job `deploy`.
- **Envoi** : le job `deploy` passe l'archive sur l'entrée standard d'un `ssh` dont la clé ne peut lancer que le script de release :

  ```
  restrict,command="/usr/local/bin/cdf3-release-front <instance>" ssh-ed25519 AAAA… ci cdf2-front <instance>
  ```

Environnement GitHub, secrets, concurrence et rotation de la clé : mêmes règles que pour l'API, décrites dans [cdf2-back/deploy](https://github.com/gabigab117/cdf2-back/tree/main/deploy#déploiement-continu).

## Fichiers

| Fichier | Installé en | Rôle |
|---|---|---|
| `release-front.sh` | `/usr/local/bin/cdf3-release-front` | Release du front |
| `systemd/cdf3-web@.service` | `/etc/systemd/system/` | Serveur Nitro (Node 24), une instance par environnement (`cdf3-web@preprod`), écoute en local seulement. Durci : système en lecture seule, mémoire et CPU plafonnés |
