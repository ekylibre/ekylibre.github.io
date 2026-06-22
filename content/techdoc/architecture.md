---
title: Architecture
nav_title: Architecture
sort_rank: 20
nav_icon: sitemap
toc: full
---

# Architecture d'Ekylibre

Vue d'ensemble des services qui composent une instance Ekylibre, de leurs interactions, et des choix structurants.

## Schéma interactif des services

Le schéma ci-dessous est rendu en **PixiJS** : survolez un service pour voir son rôle, observez les flux de requêtes animés. Le contenu est purement décoratif — toute l'information est aussi présente dans les sections texte ci-dessous.

<div id="architecture-diagram" class="techdoc-pixi-stage techdoc-pixi-stage--tall" data-pixi-component="architecture" aria-hidden="true"></div>

<script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js" defer></script>
<script src="/javascripts/techdoc-architecture-diagram.js" defer></script>

## Vue d'ensemble (texte)

```
                ┌─────────────┐
                │  Navigateur │
                └──────┬──────┘
                       │ HTTPS
                       ▼
                ┌─────────────┐
                │    Caddy    │  ← TLS, Let's Encrypt auto, on-demand
                │  (reverse-  │     (prod) / cert local (dev)
                │   proxy)    │
                └──┬───────┬──┘
                   │       │
        ┌──────────▼─┐   ┌─▼──────────┐
        │   Rails    │   │  duke-api  │  (optionnel)
        │   (Puma)   │   │  chatbot   │
        └──┬─────┬───┘   └─────┬──────┘
           │     │              │
           │     │              ▼
           │     │       ┌──────────────┐
           │     │       │ postgres-duke│
           │     │       └──────────────┘
           │     │
       ┌───▼─┐ ┌─▼────┐
       │ DB  │ │ Redis│
       │ +   │ │      │
       │POST-│ └──┬───┘
       │ GIS │    │
       └──┬──┘    │
          │       │ enqueue / fetch
          │       │
          │  ┌────▼─────┐
          └──┤ Sidekiq  │  ← jobs asynchrones
             │ (worker) │     (imports, exports, intégrations)
             └──────────┘
```

## Les services en détail

### Caddy — reverse-proxy HTTPS

**Rôle :** terminaison TLS, routage des sous-domaines vers Rails ou Duke.

- **En prod** : provisionne automatiquement les certificats Let's Encrypt à la demande via le mode `on_demand_tls`. Un endpoint `/health` de Rails filtre les hostnames inconnus pour éviter le rate-limit ACME.
- **En dev** : génère sa propre CA locale, le script `docker/dev/trust-ca.sh` l'installe dans le store système et NSS pour Firefox/Chrome. Domaine `*.ekylibre.localhost` (résolu nativement RFC 6761).

### Rails (Puma) — cœur applicatif

**Stack :** Ruby 2.6.6 + Rails 6.x + Puma. Port interne `3000`.

**Multi-tenancy :** chaque "ferme" est un **tenant** isolé via la gem [`apartment`](https://github.com/influitive/apartment) (schémas PostgreSQL séparés). Routage par sous-domaine : `acme.example.com` → `Apartment::Tenant.switch!('acme')`.

**Plugins :** déclarés dans `Gemfile.local` (dev) ou `docker/prod/Gemfile.prod` (prod). 13+ plugins publics couvrant les intégrations bancaires, le suivi GPS, la météo, la traçabilité, etc.

### Sidekiq — jobs asynchrones

**Rôle :** déporter les opérations longues hors du cycle requête HTTP.

Exemples : imports de catalogues, exports de bilans comptables, synchronisation Saisigo / Baqio, calculs d'interventions sur grandes parcelles.

Lit la file dans Redis, écrit les résultats dans PostgreSQL. Le même container peut donc être *app* ou *sidekiq* — c'est la commande de démarrage qui change.

### PostgreSQL + PostGIS — stockage

**Version :** 13 + PostGIS 2.5. Port interne `5432` (exposé sur `5431` en dev pour `psql` direct depuis l'hôte ; **non exposé** en prod).

**Volumétrie typique :**
- ~300 modèles ActiveRecord
- ~3 GB de **lexicon** (nomenclatures) par tenant
- ~10-100 MB de données métier par exploitation moyenne

**Schémas séparés** :
- `public` : tables système, lexicon partagé
- `<tenant_name>` : tables métier propres à chaque ferme

### Redis — cache + file Sidekiq

**Version :** 7-alpine. Port interne `6379`, **non exposé**.

**Usages :**
- File Sidekiq (jobs en attente, en cours, échoués)
- Cache Rails (fragments de vue, queries)
- Sessions utilisateur (selon config)

> **Optimisation :** sur l'hôte, `sysctl vm.overcommit_memory=1` évite l'échec de `BGSAVE` sous pression mémoire.

### Duke — assistant chatbot (optionnel)

**Stack :** API Python (FastAPI) + PostgreSQL dédié + LLM (Anthropic / Mistral / Ollama local).

**Architecture :**
```
WebSocket ─► duke-api ─► PostgreSQL duke (historique)
                   │
                   ├─► PostgreSQL Ekylibre (lecture seule, rôle duke_reader)
                   │
                   └─► LLM (Claude / Mistral / Ollama local)
```

- Rôle PostgreSQL dédié `duke_reader` avec `GRANT SELECT` uniquement sur `public`, `postgis`, `lexicon`
- Audit RGPD via `HASH_SECRET` (toutes les requêtes utilisateur sont hashées avant log)
- Démarré via profile Docker Compose (`--profile duke`)

## Flux applicatifs typiques

### Connexion d'un utilisateur

```
Browser → Caddy (TLS) → Rails (Puma)
                          → Devise (auth)
                          → Apartment.switch(tenant)
                          → Render dashboard
```

### Saisie d'une intervention culturale

```
Browser → Rails (formulaire)
            → PostgreSQL (insert intervention + working_periods + cost_amount)
            → Sidekiq.perform_async (recalcul agrégats parcelle)
            → Redis (job enqueue)
Sidekiq → Redis (job dequeue)
       → PostgreSQL (recalculs)
       → ActionCable / WebSocket → Browser (notification temps réel)
```

### Import d'un catalogue (long)

```
Browser → Rails (upload fichier)
            → ActiveStorage (S3 ou disque)
            → Sidekiq.perform_async(CatalogImportJob)
            → Reply 202 Accepted

Sidekiq → Lecture fichier
       → Parsing
       → Insert batch par batch
       → PostgreSQL
       → Update progress (broadcast WebSocket)
```

## Choix structurants et trade-offs

### Pourquoi Rails 6 / Ruby 2.6 ?

Décision historique. La migration vers Ruby 3.x + Rails 7 est dans la roadmap v6 — voir `docs/planning/v6-brainstorm.md` dans le repo Ekylibre.

### Pourquoi PostGIS et pas une couche géo séparée ?

Les données géospatiales (parcelles, observations) sont au cœur des requêtes métier (« quelles interventions sur cette zone ? »). Une couche séparée imposerait des jointures cross-store coûteuses. PostGIS gère 99 % des cas avec `ST_Intersects` / `ST_Area` natifs.

### Pourquoi multi-tenant par schémas et pas par database ?

- **Coût opérationnel** : 1 DB = 1 backup, 1 monitoring, 1 set de migrations
- **Isolation suffisante** : `search_path` PostgreSQL garantit qu'un tenant ne voit pas les autres
- **Limite** : remontée à ~1000 tenants par instance avant de devoir sharder

### Pourquoi Caddy et pas Nginx ?

- **Cert auto** intégré (pas de cron `certbot renew`)
- **`on_demand_tls`** : provisionne à la volée pour les sous-domaines tenant, sans recharger la config
- Configuration plus lisible (Caddyfile vs nginx.conf)

### Pourquoi Sidekiq plutôt que Sucker Punch / Delayed Job ?

- Performances Redis-backed >> DB-backed
- Concurrent threads (vs processes) → moins gourmand en RAM
- Écosystème mature (Pro, Web UI, plugins de retry/dead-set)

## Ressources

- **Modèle de données** : voir [Data model](/techdoc/data-model/)
- **Plugins** : `Gemfile.local` (dev) et `docker/prod/Gemfile.prod` (prod)
- **Code source** : [github.com/ekylibre/ekylibre](https://github.com/ekylibre/ekylibre)
