---
title: Installer Ekylibre
nav_title: Installation
sort_rank: 10
nav_icon: rocket
toc: full
---

# Installer Ekylibre — 5 variantes

Ekylibre se déploie de plusieurs manières selon votre objectif (contribuer, héberger, tester). Cette page vous aide à choisir, puis vous renvoie vers la procédure pas-à-pas.

## Arbre de décision interactif

L'arbre ci-dessous vous guide vers la variante la plus adaptée à votre contexte. Il s'agit d'un mini-canvas **PixiJS**, purement visuel — toute la même information est disponible dans le tableau qui suit, si JavaScript est désactivé ou en mode `prefers-reduced-motion`.

<div id="install-decision-tree" class="techdoc-pixi-stage" data-pixi-component="install-tree" aria-hidden="true"></div>

<noscript class="techdoc-noscript">
  <p>JavaScript désactivé — référez-vous au tableau comparatif ci-dessous.</p>
</noscript>

<script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js" defer></script>
<script src="/javascripts/techdoc-install-tree.js" defer></script>

## Tableau comparatif

| Variante | Quand la choisir | Effort | Durée 1ʳᵉ install | Lien |
|---|---|---|---|---|
| **Docker dev** | Vous contribuez au code, vous voulez un environnement isolé reproductible | Faible | 30 min | [Docker dev](/techdoc/install/docker-dev/) |
| **Native Ubuntu** | Vous voulez tout maîtriser, sans Docker, sur votre poste Linux | Moyen | 1-2 h | [Native Ubuntu](/techdoc/install/native-ubuntu/) |
| **Setup app** | Étape commune aux variantes natives, après installation des dépendances système | Faible | 20 min | [Setup application](/techdoc/install/app-setup/) |
| **Docker prod standalone** | Une seule app Ekylibre sur un serveur, HTTPS auto, contrôle total | Moyen | 1 h | [Docker prod standalone](/techdoc/install/docker-prod-standalone/) |
| **Docker prod Dokploy** | Plusieurs apps sur le même serveur, UI de gestion, push-to-deploy Git | Moyen+ | 1-2 h | [Docker prod Dokploy](/techdoc/install/docker-prod-dokploy/) |

## Critères de choix

### Vous découvrez Ekylibre et voulez juste **regarder le code tourner**
→ **Docker dev**. Tout est containerisé, vous n'altérez pas votre poste. Une fois fini, `docker compose down` et il ne reste rien.

### Vous allez **contribuer activement** (PR fréquentes, debug, console Rails quotidienne)
→ **Docker dev** suffit dans 90 % des cas (volume monté, console Rails dispo). Choisissez **Native Ubuntu + Setup app** si vous avez besoin d'attacher un debugger natif ou de profiler.

### Vous **hébergez une instance** pour un client / une coopérative / vous-même
→ **Docker prod standalone** si vous gérez ce serveur uniquement pour Ekylibre. **Docker prod Dokploy** si vous y faites tourner plusieurs apps et voulez une UI de monitoring.

### Vous **packagez Ekylibre pour Debian / Ubuntu** (cas avancé)
→ Le fichier `.pkgr.yml` à la racine du repo contient les dépendances historiques (Debian 8, Ubuntu 14.04). Procédure non maintenue — préférer Docker.

## Avant de commencer — prérequis communs

Quelle que soit la variante, vérifiez les [**prérequis communs**](/techdoc/install/prerequisites/) : Git, Docker, accès aux registres d'images, DNS, sysctl.

## En cas de pépin

Toutes les erreurs courantes sont regroupées dans la page [**Résolution de problèmes**](/techdoc/install/troubleshooting/) : conflits de port, permissions Docker, Let's Encrypt rate-limit, lexicon qui ne charge pas, etc.
