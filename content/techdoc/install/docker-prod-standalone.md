---
title: Docker production (standalone)
nav_title: Docker prod standalone
sort_rank: 15
nav_icon: server
toc: full
---

# Installation Docker — Production standalone

Déploiement d'Ekylibre sur un serveur unique avec **HTTPS automatique** via Caddy + Let's Encrypt. Cette variante convient lorsque vous gérez ce serveur **uniquement** pour Ekylibre. Pour héberger plusieurs apps sur le même hôte, voir [Docker prod Dokploy](/techdoc/install/docker-prod-dokploy/).

## Prérequis

Avoir validé les [prérequis communs](/techdoc/install/prerequisites/) :

- Docker Engine ≥ 24, Docker Compose v2
- Serveur Linux (Ubuntu 22.04+ recommandé), 4 vCPU / 8 GB RAM minimum
- Ports `80` et `443` ouverts publiquement
- Wildcard DNS (`example.com` + `*.example.com`) pointant vers le serveur
- `sysctl vm.overcommit_memory=1` appliqué

## 1. Configurer le fichier `.env`

```bash
git clone -b 5.0-beta https://github.com/ekylibre/ekylibre.git
cd ekylibre
cp docker/prod/.env.dist docker/prod/.env
```

Éditer `docker/prod/.env` et renseigner **au minimum** :

| Variable | Description |
|---|---|
| `HOST_DOMAIN_NAME` | Nom de domaine (sans protocole ni sous-domaine), ex: `ekylibre.example.com` |
| `LETSENCRYPT_EMAIL` | Email pour les notifications Let's Encrypt |
| `SECRET_KEY_BASE` | À générer : `openssl rand -hex 64` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Accès HTTP Basic à `/admin` |
| `DB_PASSWORD` | Mot de passe PostgreSQL fort (20+ caractères) |

> **Sécurité :** après édition, `chmod 600 docker/prod/.env`. Ce fichier contient des secrets et est gitignored.

## 2. Récupérer les images

L'image Ekylibre est publiée sur **GHCR** par le workflow `.github/workflows/build-prod-image.yml` à chaque push sur `main` ou `5.0-beta`. **Aucun build local n'est nécessaire** en production :

```bash
docker compose -f docker/prod/docker-compose.yml pull
```

Images tirées :

- `ghcr.io/ekylibre/ekylibre/app:latest` (Rails + Sidekiq, image partagée)
- `caddy:2-alpine` (reverse-proxy)
- `kartoza/postgis:13` (PostgreSQL)
- `redis:7-alpine`

> **Pinner une version stable** : éditer `EKYLIBRE_IMAGE_TAG` dans `.env` (ex: `EKYLIBRE_IMAGE_TAG=v5.0.0`).

### Plugins embarqués

L'image GHCR embarque les plugins publics listés dans `docker/prod/Gemfile.prod` (banking, qonto, baqio, ednotif, planning, samsys, traccar, weenat, sencrop, hve, idea, hajimari, viti, etc.). Pour ajouter / retirer un plugin, éditer ce fichier et déclencher un nouveau build.

**Toujours au HEAD de la branche** : chaque build ré-interroge GitHub et installe le dernier commit de la branche déclarée pour chaque plugin. Voir le détail technique dans `docker/prod/README.md` § 2.

**Plugins privés ou path-local** : builder localement :

```bash
docker build -f docker/prod/Dockerfile -t ghcr.io/ekylibre/ekylibre/app:local .
EKYLIBRE_IMAGE_TAG=local docker compose -f docker/prod/docker-compose.yml up -d
```

Pour ce cas, adapter `docker/prod/Dockerfile` (retirer le `rm -f Gemfile.local`) et fournir votre `Gemfile.local`.

## 3. Premier démarrage

```bash
docker compose -f docker/prod/docker-compose.yml up -d
```

Suivre les logs du service `app` :

```bash
docker compose -f docker/prod/docker-compose.yml logs -f app
```

Au premier démarrage, le container `app` :

1. Crée la base (`db:create`)
2. Lance les migrations (`db:migrate`)
3. **Charge le lexicon** (`lexicon:load`) — **5 à 10 minutes**
4. Démarre Puma sur le port 3000 interne

Attendre le message `==START PUMA==` avant de tester.

Caddy provisionne les certificats Let's Encrypt **automatiquement** au premier accès HTTPS sur chaque sous-domaine.

### Architecture TLS et provisioning des certs

```
Browser ─HTTPS─► Caddy :443 (cert LE par sous-domaine)
                  │ termine TLS, provisionne on-demand via ACME
                  │
                  ├─► example.com               → app:3000  (landing)
                  ├─► duke.example.com          → duke-api:8000 (Duke, optionnel)
                  └─► *.example.com (tenants)   → app:3000

Browser ─HTTP─► Caddy :80 (challenge HTTP-01 + redirect HTTPS)
```

Le `Caddyfile` utilise `on_demand_tls` pour ne pas provisionner de cert sur des hostnames bidons :

```caddyfile
on_demand_tls {
    ask http://app:3000/health
}
```

À chaque sous-domaine inédit, Caddy interroge `/health` de Rails avant de demander un cert LE. Cela protège du rate-limit Let's Encrypt (50 certs/semaine/domaine racine).

## 4. Vérifier le déploiement

```bash
# 1. Healthcheck applicatif
curl -I https://example.com/health
# → HTTP/2 200

# 2. Page de connexion
curl -I https://example.com/
# → HTTP/2 302 (redirection vers /users/sign_in)

# 3. Cert présenté pour un tenant
curl -I https://acme.example.com/
# Premier hit : ~10s (challenge ACME), puis 302 → /sign-in

# 4. Voir les certs déjà obtenus par Caddy
docker compose -f docker/prod/docker-compose.yml exec caddy \
  ls /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/
```

## 5. Créer un premier tenant

```bash
./docker/prod/scripts/tenant-init.sh acme admin@acme.com 'MotDePasseFort!'
```

Le tenant est accessible sur `https://acme.example.com` après quelques secondes (provisioning du cert TLS).

Charger des données de démo (optionnel) :

```bash
docker compose -f docker/prod/docker-compose.yml exec -e TENANT=acme app \
  bundle exec rake first_run FOLDER=demo
```

## 6. Services et ports

| Service | Image | Rôle | Port hôte |
|---|---|---|---|
| `app` | `ghcr.io/ekylibre/ekylibre/app:latest` | Serveur Rails (Puma) | (interne 3000) |
| `sidekiq` | (même image) | Worker de jobs | — |
| `caddy` | `caddy:2-alpine` | Reverse-proxy HTTPS | `80` / `443` |
| `db` | `kartoza/postgis:13` | PostgreSQL + PostGIS | **non exposé** |
| `redis` | `redis:7-alpine` | Cache + Sidekiq | **non exposé** |

> Vérifier que les ports `5432`, `6379`, `11434` ne sont **pas** exposés sur l'hôte (`ss -tln`).

## 7. Commandes opérationnelles

```bash
# Arrêter
docker compose -f docker/prod/docker-compose.yml down

# Logs
docker compose -f docker/prod/docker-compose.yml logs -f app sidekiq

# Shell + console Rails
docker compose -f docker/prod/docker-compose.yml exec app bash
docker compose -f docker/prod/docker-compose.yml exec app bundle exec rails c

# Mise à jour applicative (image latest)
docker compose -f docker/prod/docker-compose.yml pull
docker compose -f docker/prod/docker-compose.yml up -d
```

Les migrations sont rejouées automatiquement par `startup.sh`. Le lexicon n'est rechargé que si `.lexicon-version` a changé.

## 8. Backups PostgreSQL

Backup manuel :

```bash
docker compose -f docker/prod/docker-compose.yml exec db \
  pg_dump -U ekylibre eky_production > backup_$(date +%F).sql
```

Cron quotidien avec rotation 7 jours :

```cron
0 3 * * * cd /path/to/ekylibre && docker compose -f docker/prod/docker-compose.yml exec -T db pg_dump -U ekylibre eky_production > backups/db_$(date +\%F).sql && find backups -name 'db_*.sql' -mtime +7 -delete
```

Restauration :

```bash
docker compose -f docker/prod/docker-compose.yml exec -T db \
  psql -U ekylibre eky_production < backup_2026-06-12.sql
```

## 9. Sécurité opérationnelle

- `chmod 600 docker/prod/.env` après chaque édition
- `ADMIN_PASSWORD` et `DB_PASSWORD` : 20+ caractères, générés aléatoirement
- Vérifier `ss -tln` : seuls `80` et `443` doivent être ouverts publiquement
- Mises à jour mensuelles minimum (`pull` + `up -d`)
- Backup régulier de la DB et des volumes `uploads`, `caddy-data` (certificats)

## 10. Activer Duke (assistant chatbot) — optionnel

Duke est un assistant chatbot agricole packagé en image publique GHCR. Activation en 3 étapes (configuration `.env` + recreate `db` + démarrage Duke). Procédure détaillée dans `docker/prod/README.md` §10.

```bash
./docker/prod/scripts/duke-up.sh
```

Avec LLM local (Ollama) :

```bash
./docker/prod/scripts/duke-up.sh --with-local-llm
```

> Ollama avec `mistral-nemo` (12B) est très lent sur CPU. Réservé aux serveurs GPU NVIDIA.

## 11. Erreurs fréquentes

Voir [Résolution de problèmes](/techdoc/install/troubleshooting/) — notamment :

- Caddy ne provisionne pas de cert (DNS, `/health` non joignable, rate-limit LE)
- `SECRET_KEY_BASE is empty`
- Lexicon non chargé → `./docker/prod/scripts/lexicon-reload.sh`
- App redémarre en boucle → vérifier `db pg_isready`

## Référence — variables `.env`

Voir `docker/prod/.env.dist` pour la liste exhaustive. Variables groupées en sections :

- **Application** : `RAILS_ENV`, `HOST_DOMAIN_NAME`, `ADMIN_*`, `SECRET_KEY_BASE`, Puma tuning
- **Database** : `DB_*`
- **Redis** : `REDIS_URL`
- **TLS** : `LETSENCRYPT_EMAIL`
- **Object storage** : `MINIO_*` (optionnel)
- **Observability** : `ELASTIC_APM_ACTIVE` (optionnel)
- **Duke** : `DUKE_*`, `EKYLIBRE_DB_DSN`, `HASH_SECRET`, clés LLM, `OLLAMA_*`

## Étape suivante

Pour héberger plusieurs apps sur le même serveur, voir [**Docker prod Dokploy**](/techdoc/install/docker-prod-dokploy/).
