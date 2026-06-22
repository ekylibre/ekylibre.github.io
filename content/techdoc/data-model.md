---
title: Modèle de données
nav_title: Data model
sort_rank: 30
nav_icon: database
toc: full
---

# Modèle de données

Ekylibre repose sur **PostgreSQL 13** étendu par **PostGIS 2.5** pour les données géospatiales. Le schéma compte plus de **300 modèles ActiveRecord** organisés en domaines métier : production végétale, animale, comptabilité, ventes, achats, ressources humaines.

## Vue d'ensemble des domaines

| Domaine | Modèles clés | Tables racines |
|---|---|---|
| **Production végétale** | `Activity`, `LandParcel`, `Intervention`, `Plant`, `Cultivation` | `activities`, `land_parcels`, `interventions` |
| **Production animale** | `AnimalGroup`, `Animal`, `IntegrationTask` | `animal_groups`, `animals` |
| **Comptabilité** | `Account`, `JournalEntry`, `FiscalYear` | `accounts`, `journal_entries`, `fiscal_years` |
| **Ventes / Achats** | `Sale`, `Purchase`, `Invoice`, `Payment` | `sales`, `purchases`, `parcels` (livraisons) |
| **Stock** | `Inventory`, `Product`, `ProductMovement` | `inventories`, `products`, `product_movements` |
| **Tiers** | `Entity`, `EntityAddress` | `entities` |
| **Référentiels** | `Lexicon::*` | schémas `lexicon` (variétés, intrants, équipements) |

## Lexicon — référentiel nomenclaturel

Le **lexicon** est une base nomenclaturale agricole partagée (variétés, intrants, équipements, taxonomies). Il contient **plus de 20 millions d'items** servant de référence pour tous les tenants.

- Chargé via `bin/rake lexicon:load` (voir [Setup app §6](/techdoc/install/app-setup/#lexicon))
- Versionné via `.lexicon-version` (rechargement automatique en prod si la version change)
- Stockage : schéma `lexicon` (partagé entre tenants)

## Multi-tenancy

Chaque ferme est un **tenant** isolé via la gem [`apartment`](https://github.com/influitive/apartment) :

- Un schéma PostgreSQL par tenant (ex: `acme`, `closeriedesterres`, `demo`)
- Le schéma `public` contient les tables système et le `lexicon`
- Routage HTTP par sous-domaine : `acme.example.com` → `Apartment::Tenant.switch!('acme')`

Lister les tenants :

```bash
bundle exec rails runner "puts Apartment::Tenant.list"
```

Créer un tenant :

```bash
# Native
bin/rake tenant:init TENANT=my-farm

# Docker prod
./docker/prod/scripts/tenant-init.sh my-farm admin@my-farm.com 'MotDePasse!'
```

## Géospatial (PostGIS)

Les entités géolocalisées (parcelles, observations, points GPS) utilisent les types **PostGIS** :

- `geometry(MultiPolygon, 4326)` pour les surfaces (parcelles, zones d'observation)
- `geometry(Point, 4326)` pour les points (traces GPS, observations ponctuelles)

Requêtes spatiales typiques :

```sql
-- Interventions sur une parcelle donnée
SELECT i.* FROM interventions i
JOIN land_parcels p ON ST_Intersects(i.geometry, p.shape)
WHERE p.id = 42;

-- Surface totale en hectares d'une activité
SELECT SUM(ST_Area(shape::geography) / 10000)
FROM land_parcels WHERE activity_id = 7;
```

## Ressources de référence

> Cette page est un **point d'entrée**. Pour le détail du schéma complet, les diagrammes ERD et les invariants métier :

- **Schéma DB documenté** : `docs/development/db.md` dans le repo Ekylibre (en cours d'enrichissement)
- **Algorithmes d'interventions** : `docs/development/algo/interventions.md`
- **Helpers et composants UI** : `docs/guides/helpers.md`, `docs/guides/components.md`
- **API publique** : [Online API doc](https://ekylibre.stoplight.io/docs/eky/) (Stoplight) ou OpenAPI 3.0 dans `docs/api/openapi-v2.yaml`

## Inspection rapide

### Console Rails

```bash
bundle exec rails c
```

```ruby
# Bascule sur un tenant
Apartment::Tenant.switch!('demo')

# Compter les modèles
Plant.count
Intervention.where('started_at > ?', 1.month.ago).count

# Inspecter le lexicon
Lexicon::Variety.count
Lexicon::ProductionNature.where(name: 'wheat').first
```

### Connexion SQL directe

```bash
# Dev native
psql -U ekylibre eky_development

# Dev Docker
psql -h localhost -p 5431 -U ekylibre eky_development

# Prod Docker
docker compose -f docker/prod/docker-compose.yml exec db \
  psql -U ekylibre eky_production
```

Puis dans `psql` :

```sql
-- Lister les tenants
\dn

-- Bascule sur un tenant
SET search_path TO acme, public;

-- Tables du tenant
\dt
```

## Évolutions

Pour les changements de schéma à venir, voir `docs/planning/v6-brainstorm.md` dans le repo Ekylibre.
