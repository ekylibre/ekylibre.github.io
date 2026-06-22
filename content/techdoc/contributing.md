---
title: Contribuer à Ekylibre
nav_title: Contribuer
sort_rank: 40
nav_icon: code-fork
toc: full
---

# Contribuer à Ekylibre

Merci d'envisager une contribution à Ekylibre. Ce guide décrit le workflow Git, les conventions et la procédure de soumission d'une pull request.

## 1. Où commencer ?

### Vous avez repéré un bug ou une question

Cherchez d'abord dans les [issues existantes](https://github.com/ekylibre/ekylibre/issues) — quelqu'un d'autre l'a peut-être déjà signalé. Sinon, [ouvrez une nouvelle issue](https://github.com/ekylibre/ekylibre/issues/new) avec :

- **Titre clair** décrivant le problème
- **Description détaillée** : contexte, étapes pour reproduire, comportement attendu vs observé
- **Échantillon de code** ou **cas de test exécutable** si possible
- **Version / branche** d'Ekylibre utilisée (`git rev-parse HEAD`)
- **Variante d'installation** (Docker dev / native / prod)

### Vous voulez proposer une fonctionnalité

Ouvrez d'abord une **issue de discussion** avant de coder, pour valider l'approche avec les mainteneurs. Évite de gaspiller du temps sur une PR qui sera refusée pour raison conceptuelle.

## 2. Fork & branche

[Forker Ekylibre](https://docs.github.com/en/get-started/quickstart/fork-a-repo) puis créer une branche **descriptive**, conventionnellement préfixée par le numéro d'issue :

```bash
git checkout -b 1747-add-rapeseed-varieties
```

## 3. Installer l'environnement de développement

Le plus simple : la variante [**Docker dev**](/techdoc/install/docker-dev/) — tout en container, votre poste reste propre.

Si vous voulez profiler ou attacher un debugger natif : [**Native Ubuntu**](/techdoc/install/native-ubuntu/) + [**Setup app**](/techdoc/install/app-setup/).

## 4. Faire tourner la suite de tests

Une version récente de Ruby (2.6.6) et `bundler ≥ 1.14.6` sont requises.

### Installer les dépendances de dev

```bash
bundle install
yarn install
```

### Lancer la suite complète

```bash
bundle exec rake test
```

Ou via Docker :

```bash
docker compose -f docker/dev/docker-compose.yml exec app bundle exec rake test
```

### Lancer un test ciblé

```bash
# Un fichier
bundle exec rails test test/models/intervention_test.rb

# Un test précis
bundle exec rails test test/models/intervention_test.rb:42
```

> **CI** : la suite tourne automatiquement sur les PR via `.gitlab-ci.yml` (et / ou `.github/workflows/`). Pas de merge sans CI verte.

## 5. Implémenter votre changement

### Conventions Ruby / Rails

- **RuboCop** : `.rubocop.yml` à la racine définit le style. CI échoue si non conforme.
- **Tests** : tout nouveau modèle, contrôleur ou helper s'accompagne d'un test minimum. Préférer **fixtures + assertions explicites** au DRY excessif.
- **Migrations** : irréversibles uniquement si justifié. Préférer des migrations idempotentes (`add_column_if_not_exists`, etc.).
- **Lexicon** : ne pas écrire dans les tables `lexicon` — ce sont des nomenclatures partagées versionnées.

### Conventions HAML / front

- **HAML-Lint** : `.haml-lint.yml` (le `.haml-lint_todo.yml` recense les exceptions historiques — ne pas en ajouter).
- **SCSS** : conventions BEM-ish, voir `docs/guides/ui.md` dans le repo.
- **Webpacker** : les nouveaux modules JS vont dans `app/javascript/packs/`.

### Plugins

Un changement métier large peut être un **plugin** (gem séparée) plutôt qu'un patch du core. Voir les plugins existants pour le pattern (`ekylibre-banking`, `ekylibre-baqio`…).

## 6. Commit & PR

### Messages de commit

```
sujet (50 caractères max, impératif)

Corps en lignes de 72 caractères max.

Détaille le « pourquoi » (l'effet, le bug corrigé, la motivation),
pas le « quoi » (le diff le dit déjà).

Refs #1747
```

### Soumettre la PR

```bash
git push origin 1747-add-rapeseed-varieties
```

Puis sur GitHub, ouvrir la PR avec :

- **Titre** = sujet du commit principal
- **Description** : contexte, screenshots si UI, comment tester
- **Lien vers l'issue** : `Closes #1747` ou `Refs #1747`
- **Checklist** : tests verts, RuboCop OK, doc mise à jour si comportement public modifié

### Code review

Les mainteneurs reviewent. Soyez ouvert au feedback — c'est la garantie d'un code maintenable à long terme. Pour intégrer des modifs demandées, faites des **commits additionnels** (pas de rebase / force-push, sauf demande explicite — préserve l'historique de la discussion).

## 7. Après le merge

- Supprimer votre branche locale et distante (`git branch -D 1747-...`, `git push origin :1747-...`)
- Mettre à jour votre fork
- Penser à un message de remerciement aux reviewers — l'OSS tient en partie par la sympathie 🙂

## Ressources

- **Code source** : [github.com/ekylibre/ekylibre](https://github.com/ekylibre/ekylibre)
- **Issues** : [github.com/ekylibre/ekylibre/issues](https://github.com/ekylibre/ekylibre/issues)
- **Forum** : [Discord Ekylibre](https://discord.gg/BSpD6hq7qR)
- **Code of Conduct** : voir `CODE_OF_CONDUCT.md` dans le repo (basé sur Contributor Covenant)
- **Licence** : [GNU AGPL v3](https://github.com/ekylibre/ekylibre/blob/main/LICENSE)
