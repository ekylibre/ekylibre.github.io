---
title: Installation Docker (développement)
nav_title: Docker dev
sort_rank: 12
nav_icon: cube
toc: full
---

# Installation Docker — Environnement de développement

C'est la **variante la plus simple** pour démarrer. L'environnement complet (Rails + Sidekiq + PostgreSQL/PostGIS + Redis + Caddy HTTPS local) est containerisé. Votre poste n'a besoin que de Docker et de Git.

## Schéma de la stack

```
navigateur ─► 127.0.0.1:443 (Caddy, cert auto via tls internal)
                ├─ duke.ekylibre.localhost ─► host.docker.internal:8000 (Duke local, optionnel)
                ├─ ekylibre.localhost      ─► app:3000 (landing)
                └─ *.ekylibre.localhost    ─► app:3000 (tenants)
```

| Service | Port hôte | Rôle |
|---|---|---|
| `app` | `3000` | Serveur Rails |
| `app` | `8808` | Rack Mini Profiler |
| `db` | `5431` | PostgreSQL 13 + PostGIS |
| `redis` | — (interne) | Redis 7 |
| `sidekiq` | — (interne) | Worker de jobs |
| `caddy` | `127.0.0.1:80` / `127.0.0.1:443` | Reverse-proxy HTTPS local |

## Prérequis

Avoir validé les [prérequis communs](/techdoc/install/prerequisites/) — en particulier Docker Engine ≥ 24 et Docker Compose v2.

L'image de base est sur **GHCR public**, aucune authentification requise.

## 1. Cloner le dépôt

```bash
mkdir -p ~/projects && cd ~/projects
git clone -b 5.0-beta https://github.com/ekylibre/ekylibre.git
cd ekylibre
```

## 2. Configurer `.env` du container dev

```bash
cp docker/dev/.env.dist docker/dev/.env
```

Éditer `docker/dev/.env` et renseigner **au minimum** :

| Variable | Description |
|---|---|
| `RAILS_ENV` | Laisser à `development` |
| `DB_USERNAME` / `DB_PASSWORD` | Identifiants PostgreSQL (ex: `ekylibre` / `ekylibre`) |
| `REDIS_URL` | Doit valoir `redis://redis` |
| `UID` / `GID` | Vos UID/GID hôte (`id` pour les obtenir) |

> **Important :** si votre UID hôte n'est pas `1000`, **renseignez `UID` et `GID`** dans `.env` — sinon les fichiers créés dans le volume monté seront propriété de `root` et vous ne pourrez plus les éditer depuis votre éditeur préféré.

> **Pas de configuration `/etc/hosts` à faire** : `*.ekylibre.localhost` est résolu nativement par systemd-resolved / glibc (RFC 6761).

## 3. Builder les images

Depuis la racine du projet :

```bash
docker compose -f docker/dev/docker-compose.yml build
```

Le premier build est long (téléchargement de l'image de base Ruby 2.6, ~1 GB). Les suivants sont instantanés grâce au cache Docker.

## 4. Lancer la stack

```bash
docker compose -f docker/dev/docker-compose.yml up
```

Au **premier démarrage**, le container `app` exécute automatiquement :

1. `bundle install` — gems Ruby
2. `yarn install` — packages JS
3. `rails db:create db:migrate` — création + migrations
4. `rake lexicon:load` — **5 à 10 minutes** (nomenclatures agricoles)
5. Démarrage de Puma sur le port `3000`

L'admin est ensuite accessible sur [http://localhost:3000/admin](http://localhost:3000/admin).

## 5. Charger les données de démonstration (optionnel)

```bash
docker compose -f docker/dev/docker-compose.yml exec app bundle exec rake first_run
```

## 6. HTTPS multi-tenant — Caddy + `.localhost`

Pour bénéficier de l'HTTPS local et tester le multi-tenant, il faut faire confiance à la CA Caddy **une seule fois**.

```bash
sudo apt install -y libnss3-tools   # une seule fois (Firefox/Chrome)
docker/dev/trust-ca.sh
```

Le script :

- Récupère la CA Caddy dans le volume `caddy-data`
- L'installe dans `/usr/local/share/ca-certificates/` (store système)
- L'ajoute aux bases NSS de Firefox / Chromium

**Redémarrer le navigateur** après.

### Vérifications

```bash
resolvectl query demo.ekylibre.localhost
# 127.0.0.1, ::1 — synthetic (résolution native)

curl -I https://ekylibre.localhost/
# HTTP/2 200 — landing page

curl -I https://closeriedesterres.ekylibre.localhost/
# HTTP/2 200 — tenant Rails (cert auto)
```

Tout tenant créé dans l'admin est accessible instantanément, sans toucher à `/etc/hosts`.

## 7. Plugins Ekylibre

Les plugins sont déclarés dans `Gemfile.local` (à la racine, monté en volume).

### Accès SSH aux dépôts privés

La clé SSH de l'hôte est montée automatiquement dans les containers (`~/.ssh:/home/ekylibre/.ssh`). S'assurer qu'elle est bien autorisée sur GitHub :

```bash
ssh -T git@github.com
# Hi <username>! You've successfully authenticated...
```

### Plugins par défaut

| Plugin | Dépôt |
|---|---|
| `ekylibre-baqio` | ekylibre/ekylibre-baqio |
| `ekylibre-ednotif` | ekylibre/ekylibre-ednotif |
| `ekylibre-banking` | ekylibre/ekylibre-banking |
| `ekylibre-qonto` | ekylibre/ekylibre-qonto |
| `hajimari` | ekylibre/ekylibre-hajimari |
| `idea` | ekylibre/ekylibre-idea |
| `planning` | ekylibre/ekylibre-planning |
| `ekylibre-samsys` | ekylibre/ekylibre-samsys |
| `ekylibre-traccar` | ekylibre/ekylibre-traccar |
| `ekylibre_ekyviti` | ekylibre/ekylibre-viti |
| `weenat` | ekylibre/ekylibre-weenat |
| `ekylibre-economic` | ekylibre/ekylibre-economic |
| `ekylibre-natuition` | ekylibre/ekylibre-natuition |

### Après modification de `Gemfile.local`

Aucun rebuild d'image n'est nécessaire — `bundle install` est lancé au démarrage du container. Pour le forcer :

```bash
docker compose -f docker/dev/docker-compose.yml exec app bundle install --path vendor/bundle
```

## 8. Commandes utiles au quotidien

```bash
# Arrêter
docker compose -f docker/dev/docker-compose.yml down

# Logs d'un service
docker compose -f docker/dev/docker-compose.yml logs -f app

# Shell dans le container app
docker compose -f docker/dev/docker-compose.yml exec app bash

# Console Rails
docker compose -f docker/dev/docker-compose.yml exec app bundle exec rails c

# Connexion directe à la DB depuis l'hôte
psql -h localhost -p 5431 -U ekylibre eky_development
```

## 9. Erreurs fréquentes

Toutes regroupées dans [Résolution de problèmes](/techdoc/install/troubleshooting/) :

- Permissions sur `vendor/bundle` / `/app` → vérifier `UID`/`GID` dans `.env`
- Warning Redis `Memory overcommit` → `sudo sysctl vm.overcommit_memory=1`
- Image inaccessible (`403 Forbidden`) → vérifier authentification registry

## Étape suivante

L'app est en route. Pour comprendre les services et leurs interactions, lire [**Architecture**](/techdoc/architecture/). Pour contribuer, lire [**Contribuer**](/techdoc/contributing/).
