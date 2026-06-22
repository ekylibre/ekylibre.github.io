---
title: Prérequis communs
nav_title: Prérequis
sort_rank: 11
nav_icon: check-square-o
toc: full
---

# Prérequis communs à toutes les variantes

Quelle que soit la façon dont vous installez Ekylibre, vous aurez besoin de ces outils et de ces accès. Cochez chaque section avant d'aller plus loin.

## 1. Git

Toutes les variantes commencent par un `git clone`. Vérifier la présence de Git :

```bash
git --version
# git version 2.43.0 (ou supérieur)
```

Installer si absent :

```bash
sudo apt update && sudo apt install -y git
```

> **Astuce :** configurez une [clé SSH GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) avant de cloner. Plusieurs plugins Ekylibre sont sur des dépôts privés et nécessitent un accès SSH lors du `bundle install`.

## 2. Docker (variantes Docker uniquement)

Docker Engine **≥ 24** et Docker Compose **v2** intégré :

```bash
docker --version
# Docker version 24.x.x ou plus
docker compose version
# Docker Compose version v2.x.x
```

Installation Ubuntu/Debian (procédure officielle) :

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Se déconnecter / reconnecter pour activer le groupe
```

Vérifier qu'il fonctionne sans `sudo` :

```bash
docker run --rm hello-world
```

## 3. Accès aux registres d'images

L'image Ekylibre de production est publiée sur **GHCR** (GitHub Container Registry — public) :

- `ghcr.io/ekylibre/ekylibre/app:latest` (Rails + Sidekiq)
- `ghcr.io/ekylibre/docker-base-images/ruby2.6:latest` (image de base de dev)

Aucune authentification requise pour ces images publiques.

> **Note :** certains pipelines historiques pointent encore vers `registry.gitlab.com/ekylibre/...`. Si vous y êtes redirigé, il vous faudra un [Personal Access Token GitLab](https://gitlab.com/-/profile/personal_access_tokens) avec le scope `read_registry`, puis `docker login registry.gitlab.com`.

## 4. DNS (variantes prod uniquement)

Le déploiement multi-tenant d'Ekylibre repose sur un **wildcard DNS** : chaque tenant est un sous-domaine.

| Type | Nom | Cible |
|---|---|---|
| `A` | `example.com` | `<IP_serveur>` |
| `A` | `*.example.com` | `<IP_serveur>` |

Vérifier :

```bash
dig +short example.com acme.example.com
# Les deux doivent renvoyer la même IP
```

> **Pour la variante Docker dev :** **aucune** configuration DNS n'est nécessaire — `*.ekylibre.localhost` est résolu nativement par systemd-resolved / glibc (RFC 6761).

## 5. Configuration `sysctl` (variantes prod)

Redis recommande `vm.overcommit_memory=1` pour éviter les échecs de `BGSAVE` sous pression mémoire. À faire **une seule fois** sur l'hôte :

```bash
echo "vm.overcommit_memory = 1" | sudo tee /etc/sysctl.d/99-redis-overcommit.conf
sudo sysctl --system

# Vérification
sysctl vm.overcommit_memory
# vm.overcommit_memory = 1
```

Non-bloquant : Redis fonctionne sans, mais un warning persiste dans les logs.

## 6. Ressources serveur (variantes prod)

| Ressource | Minimum recommandé |
|---|---|
| **vCPU** | 4 |
| **RAM** | 8 GB |
| **Disque** | 30 GB (lexicon ~3 GB + DB + assets) |
| **OS** | Ubuntu 22.04+ ou équivalent |

Pour une instance multi-tenants avec usage soutenu, viser **8 vCPU / 16 GB RAM**.

## 7. Ports à ouvrir (variantes prod)

| Port | Protocole | Usage |
|---|---|---|
| `80` | TCP | Challenge HTTP-01 Let's Encrypt + redirection HTTPS |
| `443` | TCP | Trafic applicatif HTTPS |
| `22` | TCP | SSH (votre poste uniquement) |

Les ports DB (`5432`), Redis (`6379`) et Sidekiq ne **doivent pas** être exposés publiquement.

## 8. Outils complémentaires (selon variante)

| Outil | Variante concernée | Pour quoi faire |
|---|---|---|
| `curl` | Toutes | Tests de healthcheck, install Docker |
| `openssl` | Prod | Générer `SECRET_KEY_BASE` (`openssl rand -hex 64`) |
| `psql` | Toutes | Inspecter la base depuis l'hôte (optionnel) |
| `libnss3-tools` | Dev (Linux) | Faire confiance à la CA locale de Caddy |
| `gpg` | Native | Génération de clé pour signature de documents |

## Prêt ?

Vous avez tout ce qu'il faut → choisir une variante dans la [page principale d'installation](/techdoc/install/).
