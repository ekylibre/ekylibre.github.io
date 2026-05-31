# Workflow — Intégrer la spec API Ekylibre dans le site

Date : 2026-05-31
Strategy : systematic / shallow (changement isolé : 1 page + 2 layouts)
Source d'inspiration : embed Stoplight Elements (`<elements-api>` web component) fourni par l'utilisateur.

## Objectif

Remplacer le lien `API Doc` actuel (qui pointe vers `https://ekylibre.stoplight.io/docs/eky/747a3d68e6ba3-ekylibre`) par une page **interne** au site documentaire qui rend la spec OpenAPI d'Ekylibre via Stoplight Elements, dans le sous-chemin `/doc/`.

## État actuel (mesuré)

- `layouts/start.html:72` et `layouts/docs.html:71` contiennent tous deux :
  ```html
  <li><a href="https://ekylibre.stoplight.io/docs/eky/747a3d68e6ba3-ekylibre">API Doc</a></li>
  ```
- Le site est servi sous `/doc/` (GitHub Pages). Toutes les ressources internes doivent être préfixées `/doc/`.
- `Rules` ne contient pas de règle pour `/api.*`. Les fichiers HTML à la racine de `content/` qui n'ont pas de règle dédiée passent par le catch-all `compile '/**/*'` → écriture brute (pas de layout).
- `route '/**/*.{html,md}'` réécrit `content/api.html` → `public/api/index.html`. URL finale : `https://ekylibre.github.io/doc/api/`.

## Décisions à prendre AVANT implémentation

| # | Décision | Options | Reco |
|---|---|---|---|
| D1 | Source de la spec OpenAPI | (a) URL distante publique (CORS doit autoriser `ekylibre.github.io`) — ex. raw GitHub d'un repo `openapi`. (b) Fichier YAML committé dans `content/api/openapi.yaml` | **(b)** committer : pas de dépendance externe, pas de souci CORS, versionnable avec la doc |
| D2 | Layout de la page API | (a) Full-bleed standalone (aucun chrome, le widget prend 100% de la fenêtre). (b) Intégré dans `start.html` (navbar Ekylibre visible en haut, widget en dessous) | **(a)** full-bleed : Stoplight Elements a sa propre sidebar/header, mélanger avec la navbar Ekylibre donne un double-chrome confus |
| D3 | Position dans le menu | (a) Remplacer le lien externe Stoplight existant. (b) Garder les deux (interne + externe) | **(a)** remplacer : éviter la dispersion, garder un seul lien canonique |
| D4 | Polyfills navigateur | Stoplight Elements requiert les Web Components ; les navigateurs modernes les supportent natifs | Aucun polyfill nécessaire ; documenter "navigateur récent requis" |

Si D1=(b) : **l'utilisateur doit fournir le fichier `openapi.yaml` ou pointer vers une source à committer.** Sans ce fichier, le workflow est bloqué.

---

## Phase 1 — Préparation (dépendance externe utilisateur)

**Tasks**
1. Récupérer la spec OpenAPI canonique d'Ekylibre (depuis Stoplight Studio, export YAML/JSON).
2. Vérifier sa validité (`npx @redocly/cli lint openapi.yaml` ou équivalent — optionnel).
3. Placer le fichier à `content/api/openapi.yaml` (si D1=b) ou noter l'URL distante (si D1=a).

**Checkpoint 1** : Spec disponible et valide → continuer. Sinon → STOP.

**Dépendances** : aucune (pré-requis).

---

## Phase 2 — Page HTML standalone

**Tasks**
1. Créer `content/api.html` (frontmatter Nanoc minimal pour skipper tout layout) :
   ```html
   ---
   ---
   <!doctype html>
   <html lang="fr">
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
       <title>API Ekylibre — Documentation</title>
       <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
       <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
       <link rel="shortcut icon" href="/doc/assets/favicons/favicon.ico">
     </head>
     <body style="margin:0">
       <elements-api
         apiDescriptionUrl="/doc/api/openapi.yaml"   <!-- si D1=b -->
         router="hash"
         layout="sidebar"
       />
     </body>
   </html>
   ```
   - `apiDescriptionUrl` : préfixé `/doc/` si fichier local, sinon URL absolue externe.
   - `router="hash"` : navigation interne par `#/operations/...`, pas de problème avec le hosting statique GH Pages.
   - Favicon réutilisée pour cohérence.
2. Si D1=b : copier la spec dans `content/api/openapi.yaml` — c'est traité par le passthrough catch-all ; pas besoin de filtre.
3. Ajouter une règle Nanoc explicite dans `Rules` pour garantir que `content/api.html` est **routé sans layout** :
   ```ruby
   compile '/api.*' do
     # pas de filter, pas de layout — passe brut au routeur
   end
   ```
   Placer **avant** le catch-all `compile '/**/*'`. Sans cette règle, la page traverserait le catch-all qui appelle `write item.identifier.to_s` (donc `/api.html` au lieu de `/api/index.html`) — incohérent avec le routing pretty-URL. Le mieux est d'utiliser :
   ```ruby
   compile '/api.*' do
   end
   route '/api.*' do
     '/api/index.html'
   end
   ```
   ou s'appuyer sur la route catch-all `route '/**/*.{html,md}'` qui produit déjà `/api/index.html`. **À vérifier en build local** (voir phase 4).

**Checkpoint 2** : `bundle exec nanoc` produit `public/api/index.html` contenant le code Stoplight et `public/api/openapi.yaml` accessible.

**Dépendances** : Phase 1 terminée.

---

## Phase 3 — Mise à jour du menu

**Tasks**
1. `layouts/start.html:72` — remplacer
   ```html
   <li><a href="https://ekylibre.stoplight.io/docs/eky/747a3d68e6ba3-ekylibre">API Doc</a></li>
   ```
   par
   ```html
   <li><a href="/doc/api">API Doc</a></li>
   ```
2. `layouts/docs.html:71` — même remplacement.
3. Conserver la cohérence avec le préfixe `/doc/` du reste du site (voir [[CLAUDE.md]] : tous les liens internes sont préfixés `/doc/`).

**Checkpoint 3** : grep `'stoplight\.io'` dans `layouts/` ne retourne plus rien.

**Dépendances** : Phase 2 (page existe, sinon lien cassé).

---

## Phase 4 — Build + validation locale

**Tasks**
1. `bundle exec nanoc` — vérifier compilation sans erreur.
2. Inspecter `public/api/index.html` — vérifier que la balise `<elements-api>` est intacte et `apiDescriptionUrl` correct.
3. Inspecter `public/api/openapi.yaml` — vérifier présence si D1=b.
4. Vérifier que `public/index.html` et `public/techdoc/install/index/index.html` ont le nouveau href `/doc/api` dans la nav.
5. (Optionnel) Servir `public/` via un serveur statique qui monte sur `/doc/` (ex. `npx serve public -p 3000` puis ouvrir `http://localhost:3000/api/`) — vu que `nanoc live` ne respecte pas le préfixe `/doc/`, ce test n'est pas trivial. Voir la note dans [[CLAUDE.md]].
6. `bundle exec nanoc check internal_links` — détecter rupture de lien éventuelle vers `/doc/api`.

**Checkpoint 4** : Build vert, page rendue, nav cohérente.

**Dépendances** : Phases 2 et 3.

---

## Phase 5 — Déploiement et vérification production

**Tasks**
1. Commit des changements (à la discrétion de l'utilisateur ; commande non exécutée automatiquement).
2. Push sur `master` → déclenche `.github/workflows/pages.yml`.
3. Attendre fin du déploiement (~1-2 min).
4. Visiter `https://ekylibre.github.io/doc/api/` :
   - Le widget se charge (vérifier console pour erreurs CORS, 404 sur openapi.yaml, CSP).
   - Les opérations s'affichent dans la sidebar.
5. Visiter la home `https://ekylibre.github.io/doc/` : cliquer sur "API Doc" dans la nav → atterrir sur `/doc/api/`.

**Checkpoint 5** : page accessible et fonctionnelle en prod.

**Dépendances** : Phase 4 verte.

---

## Dépendances inter-phases

```
P1 (spec disponible)  →  P2 (page HTML)  →  P3 (menu)
                                  ↓             ↓
                                  └─── P4 (build local) ───→  P5 (deploy)
```

P3 peut techniquement se faire en parallèle de P2 (l'edit du menu est indépendant), mais il pointerait vers une page 404 jusqu'à ce que P2 soit terminée. Ne pas paralléliser pour éviter une fenêtre de cassure si l'edit est commit avant P2.

## Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| CORS bloque le fetch de `openapi.yaml` (si D1=a, URL distante) | Moyenne | Bloquant | Choisir D1=b (fichier local) — pas de CORS, même origin |
| `unpkg.com` indispo / lent | Faible | Modéré | À terme : héberger les bundles Stoplight dans `content/javascripts/` et `content/stylesheets/` (1.5 Mo total). Hors scope initial. |
| CSP du host GH Pages bloque les scripts externes | Faible | Bloquant | GH Pages n'impose pas de CSP par défaut. Si méta CSP custom ajoutée plus tard, autoriser `unpkg.com`. |
| Spec OpenAPI invalide → widget en erreur | Moyenne | Visible | Valider en Phase 1 avec `@redocly/cli lint` (optionnel mais recommandé) |
| Cassure du préfixe `/doc/` si quelqu'un déploie sur autre host | Existante | Modéré | Déjà documenté dans [[CLAUDE.md]] : un seul `/doc/` dans tout le repo |
| Navigateurs vieux sans Web Components | Très faible | Visuel | Documenter "Chrome/Firefox/Safari récents" |

## Notes hors scope

- **Mise à jour automatique de la spec** : si la spec vit dans un autre repo (ex. `ekylibre/ekylibre`), envisager un workflow GH Actions qui la pull à chaque build. Hors scope ici.
- **Search interne / multi-version** : Stoplight Elements offre des modes plus avancés. Garder simple en V1.
- **Liens depuis le contenu Markdown techdoc vers la page API** : ne pas filtrer pour le moment.

## Estimation

- Implémentation : ~15 min (3 fichiers modifiés, 2 fichiers créés).
- Validation locale : ~5 min.
- Déploiement : ~2 min de build CI.
- **Total : ~25 min hors récupération de la spec OpenAPI.**

## Prochaines étapes

1. **Utilisateur** : prendre les décisions D1–D4 et fournir le fichier `openapi.yaml` (si D1=b) ou l'URL (si D1=a).
2. **Claude** : invoquer `/sc:implement` avec ce plan pour exécuter les phases 2–4.
3. **Utilisateur** : commit + push pour déclencher la phase 5.
