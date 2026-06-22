# Workflow — Documentation technique Ekylibre + tutoriel d'installation pédagogique (PixiJS)

> **Statut** : plan d'implémentation uniquement. Aucune ligne de code produite par ce document.
> Étape suivante : `/sc:implement claudedocs/workflow_techdoc_install_pixijs.md` ou exécution manuelle phase par phase.

## 1. Objectif

Livrer trois choses cohérentes sur le site Nanoc `ekylibre.org` :

1. **Une entrée de menu « Tech Doc »** ajoutée dans la navbar des deux layouts utilisés (`layouts/start.html` et `layouts/docs.html`), pointant vers `/techdoc/`.
2. **Une documentation technique en français** construite à partir des sources de `/home/djoulin/projects/ekylibre` (dossiers `docs/`, `docker/`, `.env.dist`, `packaging/`, `CONTRIBUTING.md`), publiée sous `content/techdoc/`.
3. **Un tutoriel d'installation pédagogique** couvrant les 5 variantes de déploiement Ekylibre, illustré par des composants visuels interactifs en **PixiJS v8** (la lib est déjà chargée pour le hero d'accueil — voir `public/javascripts/pixijs-hero.js`).

Audience cible : intégrateur / dev backend Rails / sysadmin / contributeur open-source. Niveau : connaît Linux + Git, découvre Ekylibre.

## 2. État des lieux (ce qui existe déjà)

| Élément | Présent | Détails |
|---|---|---|
| Pipeline Nanoc `/techdoc/**/*.md` | Oui | `Rules:18-29` — redcarpet + normalize_links + version_warning + add_anchors + bootstrappify + admonition + colorize_syntax + toc + layout `/docs.*` |
| Dossier `content/techdoc/` | Oui | Contient `index.md` (frontmatter `is_hidden: true`) et `install/index.md` (frontmatter `nav_icon: flask`, vide) |
| Layout `layouts/docs.html` | Oui | Navbar **n'inclut pas** « Tech Doc » ni le sélecteur de langue présent dans `start.html` |
| Layout `layouts/start.html` | Oui | Navbar inclut Home / User Doc FR / API / FAQ / Forum / Demo / GitHub / Twitter / Discord / Lang switcher |
| PixiJS v8 chargé | Oui | Via CDN sur la home (`content/index.html:104`), wrapper d'init prêt dans `public/javascripts/pixijs-hero.js` |
| Source de doc Ekylibre | Oui | `~/projects/ekylibre/docs/installation/{README,ubuntu-20.04-lts,eky-ekylibre}.md`, `docker/{dev,prod,test}/README.md`, `docker/prod/DOKPLOY.md`, `docker/README.md`, `.env.dist`, `CONTRIBUTING.md`, `docs/index.md` |
| Données pour TOC latéral (`docs.html`) | **À vérifier** | Le layout actuel a `<div class="col-md-3 side-nav-col"></div>` vide — aucune sidebar de navigation entre pages |

## 3. Variantes d'installation à documenter

Les 5 chemins distincts identifiés dans la source Ekylibre :

| # | Variante | Source de référence | Public visé |
|---|---|---|---|
| 1 | **Installation native Ubuntu 20.04 LTS** (Rbenv, Ruby 2.6.6, Node LTS, PostgreSQL 13 + PostGIS 2.5, Java 8, Redis, certificats Renater, PROJ) | `ekylibre/docs/installation/ubuntu-20.04-lts.md` | Dev qui veut tout maîtriser |
| 2 | **Setup app Eky/Ekylibre** (clone, bundle, yarn, `.env`, `db:create`, GPG, `lexicon:load`, `first_run`, `tenant:init`, démarrage `rails s` + `sidekiq` + `webpack-dev-server`) | `ekylibre/docs/installation/eky-ekylibre.md` | Étape commune à toutes les variantes natives |
| 3 | **Docker dev** (volume monté, `*.ekylibre.localhost` RFC 6761, image `ghcr.io/ekylibre/docker-base-images/ruby2.6`) | `ekylibre/docker/dev/README.md` + `docker-compose.yml` + `Dockerfile` | Dev qui veut un setup rapide isolé |
| 4 | **Docker prod standalone** (Caddy + Let's Encrypt auto, `ghcr.io/ekylibre/ekylibre/app:latest`, wildcard DNS, `Gemfile.prod` pour plugins publics) | `ekylibre/docker/prod/README.md` + `docker-compose.yml` + `Dockerfile` | Sysadmin déployant une instance unique |
| 5 | **Docker prod Dokploy** (PaaS multi-app, Traefik, push-to-deploy Git, UI de monitoring) | `ekylibre/docker/prod/DOKPLOY.md` + `docker-compose.dokploy.yml` | Sysadmin gérant plusieurs apps |

Variante bonus : **Build natif via `.pkgr.yml`** (packaging Debian 8 / Ubuntu 14.04) — à mentionner en note d'archive, plus à jour mais documente les dépendances système historiques.

## 4. Architecture cible (arbre de fichiers)

```
content/techdoc/
├── index.md                          # MAJ : retirer is_hidden, devient la home techdoc avec cartes "5 variantes"
├── install/
│   ├── index.md                      # MAJ : sommaire pédagogique + arbre décisionnel "quelle variante choisir ?"
│   ├── prerequisites.md              # NOUVEAU : dépendances communes (Git, Docker, accès registry, DNS)
│   ├── native-ubuntu.md              # NOUVEAU : variante 1 (réécrite, structurée par chapitres + admonitions)
│   ├── app-setup.md                  # NOUVEAU : variante 2 (étape commune)
│   ├── docker-dev.md                 # NOUVEAU : variante 3
│   ├── docker-prod-standalone.md     # NOUVEAU : variante 4
│   ├── docker-prod-dokploy.md        # NOUVEAU : variante 5
│   └── troubleshooting.md            # NOUVEAU : erreurs fréquentes (PROJ, pg_hba, UID/GID, ports, Let's Encrypt)
├── architecture.md                   # NOUVEAU : vue d'ensemble (Rails / Sidekiq / Postgres+PostGIS / Redis / Caddy / plugins)
├── data-model.md                     # NOUVEAU (ou stub) : pointe vers docs/development/db.md
└── contributing.md                   # NOUVEAU : reprise de CONTRIBUTING.md adaptée

public/javascripts/
├── pixijs-hero.js                    # EXISTANT (laisser tel quel)
├── techdoc-install-tree.js           # NOUVEAU : arbre décisionnel interactif (variante 1..5)
├── techdoc-architecture-diagram.js   # NOUVEAU : schéma d'architecture animé (services + flux)
└── techdoc-install-progress.js       # NOUVEAU : barre de progression pédagogique par étapes

public/stylesheets/
└── techdoc.css                       # NOUVEAU : styles pour cartes variantes, sidebar TOC, canvases pixi

layouts/
├── start.html                        # MAJ : ajouter <li><a href="/techdoc/">Tech Doc</a></li>
└── docs.html                         # MAJ : ajouter même entrée + lang switcher + sidebar techdoc (col-md-3)

content/techdoc/images/               # NOUVEAU : assets (icônes services, sprites Duke/tractor pour pixi)
```

## 5. Phases d'exécution

### Phase 0 — Décisions à valider avant de commencer

À faire valider à l'utilisateur **avant** Phase 1 :

1. **Langue** : techdoc en **français** (pour cohérence avec `content/fr/user-doc/` et la cible francophone du dev Ekylibre) ou bilingue ?
   - Recommandation : **français seul** pour la v1, structure prévue pour ajouter `/en/techdoc/` plus tard => OK
2. **Préfixe d'URL** : `/techdoc/` (chemin actuel, root-level) confirmé ? => OK
   - Recommandation : oui, conforme au pipeline `Rules:18` déjà en place.
3. **Sidebar de navigation** dans `docs.html` : générer dynamiquement depuis `@items.find_all('/techdoc/**/*')` triés par `sort_rank` => OK
   - Recommandation : helper Ruby dans `lib/helpers/` (cohérent avec l'architecture Nanoc — voir `CLAUDE.md` § 2).
4. **Versionnement** : on documente la branche `5.0-beta` d'Ekylibre uniquement qui va devenir main.
   - Recommandation : **branche `5.0-beta` uniquement**
5. **PixiJS** : 3 composants visuels proposés (arbre décisionnel, schéma archi, progress par étapes). On garde les 3
   - Recommandation : **arbre décisionnel d'abord** (haute valeur pédagogique, surface limitée) => On garde les 3

### Phase 1 — Refonte de la navigation (menu)

**Objectif** : entrée « Tech Doc » visible depuis toutes les pages, layout `docs.html` aligné sur `start.html`.

**Étapes** :

1. **`layouts/start.html`** — Ajouter `<li><a href="/techdoc/">Tech Doc</a></li>` entre « User Doc FR » et « API Doc » (lignes 86-87 actuelles).
2. **`layouts/docs.html`** — Réécrire la navbar (lignes 69-78) pour qu'elle soit identique à `start.html` :
   - Ajouter Home, Tech Doc, Demo, Lang switcher, GitHub/Twitter/Discord icônes.
   - Conserver l'URL « FAQ » `/fr/faq` (pas `/faq`) qui est la bonne route.
3. **Sidebar techdoc** dans `docs.html` (`<div class="col-md-3 side-nav-col">` actuellement vide) :
   - Créer `lib/helpers/techdoc_nav.rb` exposant `techdoc_sidebar` qui itère `@items.find_all('/techdoc/**/*.md')`, trie par `sort_rank` (frontmatter) puis par titre, et émet une `<ul>` Bootstrap avec mise en surbrillance de l'item courant.
   - Injecter `<%= techdoc_sidebar %>` dans la colonne.

**Vérifs** :
- `bundle exec nanoc check internal_links` doit rester vert.
- Charger `http://localhost:3000/`, `/fr/user-doc/demarrage`, `/techdoc/` et confirmer visuellement la cohérence du menu.

**Risque** : `layouts/docs.html` mentionne encore Prometheus dans `meta name="description"`, `og:image`, etc. (lignes 7-14, 36-40). **Hors scope** de cette phase mais à signaler — proposer un lot de nettoyage Prometheus séparé.

### Phase 2 — Génération de la documentation technique (contenu)

**Objectif** : transformer la doc source d'Ekylibre (Markdown brut, parfois extrait de Confluence) en pages cohérentes, pédagogiques, fr, kramdown/redcarpet-friendly.

**Pour chaque fichier `content/techdoc/**/*.md` à créer :**

- Frontmatter obligatoire :
  ```yaml
  ---
  title: <Titre humain en français>
  sort_rank: <entier — ordre dans la sidebar>
  nav_icon: <classe fontawesome, ex: fa-server, fa-docker, fa-rocket>
  toc: full           # active le filtre toc.rb (voir Rules:27)
  ---
  ```
- Convention : titres niveau 2 (`##`) pour les sections sidebar, niveau 3 (`###`) pour les sous-sections.
- Blocs de code avec langue précisée (`bash`, `yaml`, `ruby`) — l'ancien doc Confluence utilisait `java` par défaut, **à remplacer**.
- Admonitions (`> **Note:**`, `> **Attention:**`) — gérées par le filtre `admonition.rb` (`Rules:24`).
- Liens internes en chemins absolus root-relative (`/techdoc/install/native-ubuntu/`) — pas de sous-path.

**Fichiers à produire** (ordre suggéré) :

| Ordre | Fichier | Source principale | Adaptations clés |
|---|---|---|---|
| 1 | `content/techdoc/index.md` | `ekylibre/docs/index.md` + intro nouvelle | Retirer `is_hidden`, ajouter cartes Bootstrap pour les 5 variantes, plug PixiJS arbre décisionnel |
| 2 | `content/techdoc/architecture.md` | Analyse repo (`config/`, `app/`, `docker/README.md` comparatif) | Schéma services Rails+Sidekiq+PG+Redis+Caddy ; pose le vocabulaire pour le reste |
| 3 | `content/techdoc/install/index.md` | Réécriture | Arbre décisionnel (canvas Pixi #1) + tableau comparatif (4 colonnes : effort, durée, prérequis, cible) |
| 4 | `content/techdoc/install/prerequisites.md` | Nouveau | Git, Docker ≥24, accès GHCR, DNS wildcard, sysctl `vm.overcommit_memory` |
| 5 | `content/techdoc/install/native-ubuntu.md` | `ubuntu-20.04-lts.md` | Réécrire chaque section, remplacer `java`→`bash` dans les fences, fixer les liens Confluence cassés, ajouter admonitions « pourquoi cette étape » |
| 6 | `content/techdoc/install/app-setup.md` | `eky-ekylibre.md` | Découper en sous-sections : Clone → Bundle → `.env` → DB → GPG → Lexicon → First-run/Tenant → Démarrage |
| 7 | `content/techdoc/install/docker-dev.md` | `docker/dev/README.md` | Conserver tel quel ou presque (déjà bien rédigé), ajouter une intro pédagogique et un schéma services |
| 8 | `content/techdoc/install/docker-prod-standalone.md` | `docker/prod/README.md` | Idem, mettre en avant la séparation Caddy/Rails/Sidekiq |
| 9 | `content/techdoc/install/docker-prod-dokploy.md` | `docker/prod/DOKPLOY.md` | Idem, expliquer quand préférer Dokploy au standalone |
| 10 | `content/techdoc/install/troubleshooting.md` | Synthèse | Erreurs PROJ > 5.2, pg_hba peer/md5, UID/GID Docker, ports occupés, Let's Encrypt rate-limit, Redis BGSAVE warning |
| 11 | `content/techdoc/contributing.md` | `CONTRIBUTING.md` | Traduction + adaptation au workflow Github actuel |
| 12 | `content/techdoc/data-model.md` | Stub renvoyant vers `docs/development/db.md` | Placeholder pour futur diagramme ERD |

**Vérifs** :
- `bundle exec nanoc check internal_links` → tous les liens internes valides.
- `bundle exec nanoc check external_links` → liens externes (atlassian.net, gitlab.com…) au moins testés une fois ; les liens Confluence cassés doivent être retirés.
- TOC auto-générée correcte sur chaque page (le filtre `toc.rb` lit `item[:toc]`).

### Phase 3 — Composants PixiJS pédagogiques

**Objectif** : rendre la doc visuellement engageante sans transformer le site en jouet. PixiJS v8 (déjà chargé) sert ici à des micro-illustrations interactives.

**Composant 3.1 — Arbre décisionnel « Quelle variante choisir ? »** (`techdoc-install-tree.js`)

- Canvas inséré dans `install/index.md` via `<div id="install-decision-tree"></div>`.
- Affiche un arbre binaire avec questions (« Vous voulez contribuer au code ? », « Plusieurs apps sur le même serveur ? », « Vous gérez vous-même votre OS ? »).
- Chaque feuille est une carte cliquable vers `docker-dev/`, `native-ubuntu/`, `docker-prod-standalone/`, `docker-prod-dokploy/`.
- Animation : pop-in successif des nœuds, pulsation douce sur la feuille recommandée selon le chemin.
- Fallback : si `typeof PIXI === 'undefined'` (ou `prefers-reduced-motion`), afficher un `<ul>` statique avec mêmes liens (déjà présent en dur, le canvas se superpose).

**Composant 3.2 — Schéma d'architecture animé** (`techdoc-architecture-diagram.js`)

- Canvas dans `architecture.md` via `<div id="architecture-diagram"></div>`.
- Sprites des services (Rails, Sidekiq, PG, Redis, Caddy, Browser) avec flèches animées (requêtes HTTP → Caddy → Rails ; Rails → PG ; Rails → Redis → Sidekiq ; Sidekiq → PG).
- Survol d'un service : highlight + tooltip avec rôle.
- Fallback : `<img>` PNG statique du même schéma (à produire en parallèle).

**Composant 3.3 — Barre de progression d'installation** (`techdoc-install-progress.js`)

- En haut de chaque page `install/native-ubuntu.md` / `install/app-setup.md`.
- 8-10 étapes (Rbenv → Ruby → Node → Postgres → Java → Clone → Bundle → DB → Lexicon → Run).
- L'étape courante détectée via l'ancre `#section-en-cours` scrollée (IntersectionObserver) ; animation Pixi de remplissage progressif.
- Fallback : barre HTML/CSS sans animation.

**Convention commune** (héritée de `pixijs-hero.js`) :
- Bail-out précoce si `typeof PIXI === 'undefined'`, `prefers-reduced-motion`, ou conteneur absent.
- `app.init({ resizeTo: container, backgroundAlpha: 0, autoDensity: true, resolution: min(devicePixelRatio,2) })`.
- `document.addEventListener('visibilitychange', ...)` pour stopper le ticker hors onglet actif.
- Assets dans `/images/techdoc/` (sprites des services, icônes des variantes).

**Vérifs** :
- Ouvrir sur Chrome desktop + mobile (Chrome devtools responsive) + Firefox.
- Désactiver JS : la doc reste lisible.
- `prefers-reduced-motion: reduce` : aucun canvas ne démarre.

### Phase 4 — Styles et accessibilité

**Objectif** : `public/stylesheets/techdoc.css` neuf, importé par `layouts/docs.html`.

- Cartes Bootstrap des variantes (header coloré par type : natif, docker, paas).
- Sidebar techdoc (col-md-3) sticky, scrollable, avec mise en surbrillance active.
- Conteneurs canvases : `position: relative`, `aspect-ratio` défini pour éviter les sauts de layout.
- Codes blocks : surcharge mineure de `docs.css` pour bandeau « copier » (option) — **out of scope v1 si trop coûteux**.

**Accessibilité** :
- Canvases PixiJS : `aria-hidden="true"` + fallback HTML visible.
- Sidebar : `<nav aria-label="Documentation technique">` + indication `aria-current="page"`.
- Code samples : conserver les langues détectables pour les screen readers.

### Phase 5 — Build, validation, déploiement

1. `bundle install` (si nouvelles gems requises — a priori non, tout est déjà là).
2. `bundle exec nanoc` — build complet, vérifier `public/techdoc/` produit avec toutes les pages.
3. `bundle exec nanoc check internal_links` + `external_links`.
4. `bundle exec nanoc live` — test interactif dans le navigateur :
   - Menu présent partout, pointe correctement.
   - Sidebar techdoc visible et navigable.
   - Arbre décisionnel PixiJS s'affiche et est cliquable.
   - Pages d'installation lisibles, TOC à droite, syntax highlight OK.
5. Commit + push sur `master` → GitHub Actions (`.github/workflows/pages.yml`) publie automatiquement.
6. Vérification post-déploiement sur `https://ekylibre.org/techdoc/`.

## 6. Dépendances entre phases

```
Phase 0 (décisions)
    ↓
Phase 1 (navigation) ──┐
                       ├──→ Phase 5 (build & deploy)
Phase 2 (contenu) ─────┤
                       │
Phase 3 (PixiJS) ──────┤   (peut commencer en parallèle dès Phase 2 partielle)
                       │
Phase 4 (CSS) ─────────┘
```

Phase 1 et Phase 2 peuvent démarrer en parallèle (un dev sur le layout, un sur le contenu).
Phase 3 dépend de Phase 2 (besoin des pages cibles pour insérer les divs canvas).
Phase 4 peut démarrer dès Phase 1 (structure HTML connue).

## 7. Checkpoints / Critères de done

| # | Checkpoint | Critère mesurable |
|---|---|---|
| C1 | Menu OK | « Tech Doc » visible et fonctionnel depuis home, page user-doc, page techdoc |
| C2 | Sidebar OK | Toutes les pages techdoc affichent la sidebar, item courant en surbrillance |
| C3 | Contenu complet | 12 fichiers `content/techdoc/**/*.md` créés/modifiés, build sans warning |
| C4 | Liens valides | `nanoc check internal_links` exit 0 |
| C5 | PixiJS OK | Arbre décisionnel s'affiche, cliquable, fallback fonctionne JS désactivé |
| C6 | A11y minimum | Lighthouse a11y score ≥ 90 sur `/techdoc/install/` |
| C7 | Déployé | `https://ekylibre.org/techdoc/` répond 200, contenu identique au local |

## 8. Risques et points d'attention

- **Doc source obsolète** : `ubuntu-20.04-lts.md` cible Ubuntu 20.04 + Ruby 2.6.6 — Ubuntu 20.04 fin de support 2025, Ruby 2.6 EOL depuis 2022. **Action** : ajouter un encart « Cette procédure cible les anciennes versions qui utilise encore Ruby 2.6. Pour Ubuntu 22.04+, voir Docker. » plutôt que de réécrire pour 22.04 (qui demanderait un test réel).
- **Liens Confluence cassés** : chaque fichier source pointe vers `ekylibre.atlassian.net/...` — souvent inaccessible publiquement. **Action** : retirer ces liens (pas les remplacer par des liens morts) => OK
- **Layout `docs.html` encore brandé Prometheus** : `meta description`, `og:image`, footer reference Prometheus dans le source. **Pas dans le scope** mais à signaler dans le PR.
- **Pas de tests automatisés du JS** : les composants PixiJS seront vérifiés visuellement uniquement. Acceptable pour ce site (statique, peu de logique).
- **Volume de contenu** : ~12 fichiers MD, ~3 fichiers JS, ~1 CSS, ~2 layouts → entre 4h et 8h de travail réel selon profondeur pédagogique souhaitée.
- **Branche master vs main** : ce repo doc est sur `master`, le repo Ekylibre référence parfois `main` et parfois `5.0-beta`. **Action** : utiliser `main` comme branche par défaut citée dans les commandes `git clone`. => oui, car on va merger la PR de la branche 5.0-beta dans main et 5.0.
- **Images Duke / sprites** : `pixijs-hero.js` référence `/images/hero/duke.png` etc. — vérifier qu'on a les droits / qu'on en produit des nouvelles pour les schémas techdoc => oui

## 9. Hors scope explicite

- Activation de `lib/data_sources/repo_docs.rb` (multi-versions).
- Traduction anglaise du techdoc.
- Refonte complète des assets Prometheus restants dans `layouts/docs.html`.
- Diagramme ERD complet du data model (placeholder `data-model.md` uniquement).
- Bandeau « copier le code » sur les blocs de code.
- Recherche full-text (Algolia / Pagefind).

## 10. Prochaine action

Demander à l'utilisateur :

1. Validation des **5 décisions** de la Phase 0 (langue, URL, sidebar, versions, périmètre PixiJS).
2. Confirmation que l'on peut produire les **3 composants PixiJS** ou seulement l'arbre décisionnel pour une v1.
3. Le go pour démarrer Phase 1+2 en parallèle.

Une fois les réponses obtenues, lancer `/sc:implement claudedocs/workflow_techdoc_install_pixijs.md`.
