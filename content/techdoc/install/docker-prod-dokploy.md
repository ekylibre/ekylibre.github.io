---
title: Docker production (Dokploy)
nav_title: Docker prod Dokploy
sort_rank: 16
nav_icon: cloud
toc: full
---

# Installation Docker — Production via Dokploy

[Dokploy](https://dokploy.com/) est un PaaS open-source basé sur Traefik. Cette variante permet de gérer plusieurs apps sur un même serveur, avec une UI web (logs, backups, push-to-deploy Git).

## Quand choisir Dokploy plutôt que standalone ?

| Mode | Quand l'utiliser |
|---|---|
| **Standalone** (`docker-compose.yml` + Caddy) | Une seule app sur le serveur, contrôle total |
| **Dokploy** (`docker-compose.dokploy.yml` + Traefik) | Plusieurs apps sur le serveur, UI de gestion, push-to-deploy |

## Prérequis

- Une instance **Dokploy** installée :
  ```bash
  curl -sSL https://dokploy.com/install.sh | sh
  ```
- Un serveur Linux dédié, 4 vCPU / 8 GB RAM minimum
- Ports `80` et `443` ouverts publiquement (gérés par Traefik via Dokploy)
- Un nom de domaine avec **wildcard DNS** pointant vers le serveur :
  ```
  example.com       A    <IP_serveur>
  *.example.com     A    <IP_serveur>
  ```

### Configuration sysctl du serveur

À faire **une fois** sur l'hôte avant le premier déploiement (en SSH root) :

```bash
echo "vm.overcommit_memory = 1" > /etc/sysctl.d/99-redis-overcommit.conf
sysctl --system
sysctl vm.overcommit_memory
# vm.overcommit_memory = 1
```

Non-bloquant : Redis fonctionne sans, mais un warning persiste dans les logs.

## 1. Créer le projet Dokploy

Dans l'UI Dokploy :

1. **Projects** → **Create Project** → nommer `ekylibre`
2. Dans le projet, **Create Service** → **Compose**
3. Nommer la compose app : `ekylibre-prod`

## 2. Configurer la source

Onglet **General** de la compose app :

| Champ | Valeur |
|---|---|
| **Source Type** | `Git` |
| **Repository URL** | `https://github.com/ekylibre/ekylibre.git` |
| **Branch** | `5.0-beta` (ou `main` selon votre cible) |
| **Compose Path** | `docker/prod/docker-compose.dokploy.yml` |

Dokploy clonera le repo à chaque déploiement.

## 3. Renseigner les variables d'environnement

Onglet **Environment** de la compose app — coller le contenu adapté de `docker/prod/.env.dist` :

```dotenv
# === Application ===
RAILS_ENV=production
EKYLIBRE_IMAGE_TAG=latest
HOST_DOMAIN_NAME=example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<mot de passe fort>
SECRET_KEY_BASE=<openssl rand -hex 64>
RAILS_SERVE_STATIC_FILES=true
RAILS_LOG_TO_STDOUT=true

# === Database ===
DB_HOST=db
DB_NAME=eky_production
DB_USERNAME=ekylibre
DB_PASSWORD=<mot de passe fort>
DB_PORT=5432

# === Redis ===
REDIS_URL=redis://redis:6379/0

# === Traefik (Dokploy) ===
# Le wildcard et la racine doivent matcher votre DNS
TRAEFIK_HOST=example.com
TRAEFIK_WILDCARD_HOST=*.example.com
```

> **Secrets** : utiliser l'UI Dokploy → Environment Secrets (chiffrés au repos) pour `SECRET_KEY_BASE`, `ADMIN_PASSWORD`, `DB_PASSWORD`.

## 4. Activer Traefik / certificats

Dans l'onglet **Domains** de la compose app, configurer un domaine pour chaque sous-domaine que vous voulez exposer (au moins `example.com` et `*.example.com`).

Dokploy déclenche automatiquement Traefik pour provisionner les certificats Let's Encrypt à chaque hostname interrogé.

> **Différence clé avec Caddy standalone** : Dokploy/Traefik s'attend à connaître les hostnames à l'avance via les labels Docker. Pour le wildcard multi-tenant, configurer Traefik avec un certificat **DNS-01 wildcard** plutôt que HTTP-01 (nécessite un provider DNS supporté : Cloudflare, OVH, Route53…). Voir la [doc Traefik](https://doc.traefik.io/traefik/https/acme/#dnschallenge).

## 5. Premier déploiement

Cliquer sur **Deploy** dans l'UI Dokploy.

Dokploy va :

1. Cloner le repo Ekylibre sur la branche déclarée
2. Builder l'image (ou la tirer depuis GHCR selon votre `docker-compose.dokploy.yml`)
3. Démarrer les services
4. Provisionner les certificats Traefik

Au premier démarrage, le container `app` charge le lexicon — **5 à 10 minutes**.

Suivre dans l'onglet **Logs** de Dokploy.

## 6. Push-to-deploy

Activer dans **General → Auto Deploy** pour redéployer automatiquement à chaque push sur la branche déclarée.

Pour un déploiement manuel ponctuel, le bouton **Deploy** force un re-clone + restart.

## 7. Créer un premier tenant

Ouvrir un shell sur le container `app` via l'UI Dokploy (onglet **Terminal**) :

```bash
./docker/prod/scripts/tenant-init.sh acme admin@acme.com 'MotDePasseFort!'
```

## 8. Backups via Dokploy

Onglet **Backups** :

- Configurer une cible S3 / volume local
- Sélectionner le service `db`
- Planifier (cron) — recommandation : quotidien à 3 h du matin, rétention 7 jours

## 9. Monitoring

Dokploy fournit out-of-the-box :

- Métriques CPU/RAM par container
- Logs temps réel
- Healthchecks
- Notifications (Discord / Telegram / Slack / Email)

## 10. Mises à jour

Si `EKYLIBRE_IMAGE_TAG=latest` : redéployer pour tirer la dernière image (cliquer **Deploy** dans l'UI).

Pour pinner une version :

1. Modifier `EKYLIBRE_IMAGE_TAG=v5.0.0` dans l'onglet Environment
2. **Save**
3. **Deploy**

## 11. Erreurs fréquentes

Voir [Résolution de problèmes](/techdoc/install/troubleshooting/) — Dokploy hérite des erreurs Docker Compose. Spécifiques à Dokploy :

- **Traefik ne route pas** → vérifier les labels `traefik.*` dans `docker-compose.dokploy.yml` et le mapping de domaine dans l'UI
- **Cert wildcard introuvable** → DNS-01 mal configuré ; vérifier le provider DNS dans la config Traefik de Dokploy

## Ressources

- [Documentation Dokploy](https://docs.dokploy.com/)
- [Traefik + Let's Encrypt DNS Challenge](https://doc.traefik.io/traefik/https/acme/#dnschallenge)
- Fichier de référence : `docker/prod/DOKPLOY.md` dans le repo Ekylibre
