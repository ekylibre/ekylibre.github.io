---
title: Documentation technique
nav_title: Accueil
sort_rank: 1
nav_icon: book
toc: false
---

# Documentation technique d'Ekylibre

> Cible : la branche **`5.0-beta`** d'`ekylibre/ekylibre`. Les commandes, fichiers Docker et variables d'environnement décrits ici correspondent à cette branche, qui deviendra `main` à la sortie de la version 5.0.

Bienvenue dans la **documentation technique** d'Ekylibre. Elle s'adresse aux personnes qui veulent **installer, opérer ou contribuer** à Ekylibre — par opposition à la [documentation utilisateur](/fr/user-doc/demarrage) qui couvre l'usage métier de l'application.

## Par où commencer ?

<div class="row techdoc-cards">
  <div class="col-md-6 col-sm-6">
    <a class="techdoc-card techdoc-card--install" href="/techdoc/install/">
      <div class="techdoc-card-icon"><i class="fa fa-rocket"></i></div>
      <h3>Installer Ekylibre</h3>
      <p>5 variantes d'installation couvertes pas-à-pas : Docker dev, Docker prod (Caddy ou Dokploy), installation native Ubuntu, setup application.</p>
      <span class="techdoc-card-cta">Choisir une variante →</span>
    </a>
  </div>
  <div class="col-md-6 col-sm-6">
    <a class="techdoc-card techdoc-card--architecture" href="/techdoc/architecture/">
      <div class="techdoc-card-icon"><i class="fa fa-sitemap"></i></div>
      <h3>Comprendre l'architecture</h3>
      <p>Vue d'ensemble des services (Rails, Sidekiq, PostgreSQL/PostGIS, Redis, Caddy) et de leurs interactions.</p>
      <span class="techdoc-card-cta">Voir le schéma →</span>
    </a>
  </div>
</div>

<div class="row techdoc-cards">
  <div class="col-md-6 col-sm-6">
    <a class="techdoc-card techdoc-card--contribute" href="/techdoc/contributing/">
      <div class="techdoc-card-icon"><i class="fa fa-code-fork"></i></div>
      <h3>Contribuer au code</h3>
      <p>Workflow Git/GitHub, conventions, tests, soumission d'une pull request.</p>
      <span class="techdoc-card-cta">Lire le guide →</span>
    </a>
  </div>
  <div class="col-md-6 col-sm-6">
    <a class="techdoc-card techdoc-card--data" href="/techdoc/data-model/">
      <div class="techdoc-card-icon"><i class="fa fa-database"></i></div>
      <h3>Modèle de données</h3>
      <p>Points d'entrée vers la documentation du schéma PostgreSQL/PostGIS (~300 modèles).</p>
      <span class="techdoc-card-cta">Explorer →</span>
    </a>
  </div>
</div>

## Stack technique en un coup d'œil

| Composant | Version | Rôle |
|---|---|---|
| **Ruby on Rails** | Ruby 2.6.6 | Cœur applicatif, serveur web (Puma) |
| **Sidekiq** | dernière | Jobs asynchrones (imports, exports, intégrations tierces) |
| **PostgreSQL + PostGIS** | 13 + 2.5 | Stockage relationnel et géospatial (multi-tenant via schémas) |
| **Redis** | 7 | Cache + file de jobs Sidekiq |
| **Node.js + Yarn** | LTS (14+) | Compilation assets via Webpacker |
| **Caddy** | 2.x | Reverse-proxy HTTPS, certificats Let's Encrypt automatiques (prod) |
| **Docker / Compose** | 24+ / v2 | Empaquetage et déploiement (dev, test, prod) |

## Conventions de cette documentation

- **Tous les chemins** sont relatifs à la racine du repo `ekylibre/ekylibre` (sauf indication contraire).
- **Blocs de code** : la première ligne précise le contexte d'exécution quand il est ambigu (hôte vs container, dev vs prod).
- **Admonitions** :
  > **Note :** information complémentaire utile.
  > **Attention :** point à ne pas manquer sous peine d'erreur.
