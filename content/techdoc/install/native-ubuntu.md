---
title: Installation native sur Ubuntu
nav_title: Native Ubuntu
sort_rank: 13
nav_icon: ubuntu
toc: full
---

# Installation native sur Ubuntu

Cette procédure installe Ekylibre **directement sur votre système** (sans Docker). Elle convient si vous souhaitez profiler, attacher un debugger natif, ou si vous administrez un serveur Ubuntu dédié à Ekylibre.

> **Cible :** Ubuntu 20.04 LTS. La branche `5.0-beta` utilise toujours Ruby 2.6.6. Pour Ubuntu 22.04+, certaines dépendances (PostGIS, libqt4, openjdk-8) nécessitent des PPAs ou des paquets ajustés. **Si vous voulez aller plus vite, préférez la variante [Docker dev](/techdoc/install/docker-dev/) ou [Docker prod](/techdoc/install/docker-prod-standalone/).**

## Barre de progression interactive

Cette page est longue. La barre ci-dessous met en surbrillance l'étape où vous vous trouvez en scrollant.

<div id="install-progress" class="techdoc-pixi-progress" data-pixi-component="install-progress" data-steps="rbenv,ruby,node,postgres,proj,java-redis,renater" aria-hidden="true"></div>

<script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js" defer></script>
<script src="/javascripts/techdoc-install-progress.js" defer></script>

## 1. Rbenv & Ruby 2.6.6 {#rbenv}

**Pourquoi rbenv ?** Ubuntu 20.04 ne fournit pas Ruby 2.6 dans ses dépôts officiels. `rbenv` permet d'installer et de basculer entre plusieurs versions de Ruby sans toucher au système.

### a. Installer Git et curl

```bash
sudo apt update && sudo apt install -y git curl
```

### b. Cloner rbenv et ruby-build

```bash
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build
```

Ajouter `rbenv` au `PATH` :

```bash
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
source ~/.bashrc
```

### c. Dépendances de compilation Ruby

```bash
sudo apt install -y build-essential libreadline-dev libssl-dev zlib1g-dev redis-server
```

### d. Installer Ruby 2.6.6 et Bundler

```bash
rbenv install 2.6.6
rbenv global 2.6.6
gem install bundler
```

Vérification :

```bash
ruby --version
# ruby 2.6.6p146 (2020-03-31 revision 67876)
```

## 2. Node.js LTS & Yarn {#node}

Ekylibre compile ses assets via Webpacker, qui requiert Node.js et Yarn.

### a. Installer nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Si la commande `nvm` n'est pas disponible après installation :

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

### b. Installer Node.js LTS

```bash
nvm install --lts
nvm alias default 'lts/*'
```

### c. Installer Yarn

```bash
npm install -g yarn
```

## 3. PostgreSQL 13 + PostGIS 2.5 {#postgres}

Ekylibre est intrinsèquement géospatial — PostGIS n'est pas optionnel.

### a. Installation

```bash
sudo apt install -y \
  postgresql-13 \
  postgresql-13-postgis-2.5 \
  postgresql-13-postgis-2.5-scripts
```

### b. Créer l'utilisateur `ekylibre`

```bash
sudo -u postgres createuser -d -P -s ekylibre
# Mot de passe demandé interactivement : choisir 'ekylibre' pour le développement local
echo "ALTER USER ekylibre SUPERUSER;" | sudo -u postgres psql
```

> **Attention :** ce mot de passe simple ne convient **que** pour le développement. En production, voir la variante [Docker prod standalone](/techdoc/install/docker-prod-standalone/).

### c. Configurer `pg_hba.conf` pour l'authentification par mot de passe

Sur une installation fraîche, PostgreSQL utilise `peer` pour les sockets Unix locaux. Ekylibre s'attend à `md5` :

```bash
sudo vim /etc/postgresql/13/main/pg_hba.conf
```

Remplacer la ligne :

```
local   all             all                                peer
```

par :

```
local   all             all                                md5
```

Recharger :

```bash
sudo systemctl restart postgresql
```

### d. (Optionnel) PgAdmin 4 Desktop

Pour inspecter visuellement la base :

```bash
curl https://www.pgadmin.org/static/packages_pgadmin_org.pub | sudo apt-key add -
sudo sh -c 'echo "deb https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list'
sudo apt update && sudo apt install -y pgadmin4-desktop
```

## 4. PROJ (projections cartographiques) {#proj}

PostGIS dépend de PROJ pour les transformations de coordonnées. La version d'Ubuntu 20.04 est en général compatible — vérifier :

```bash
dpkg -l | grep ^ii.*proj
```

> **Si la version installée est ≥ 5.2.0** et que vous rencontrez l'erreur `ERROR: source code not in proj.4 format` au lancement de Rails, il faut récupérer une version compatible de PROJ depuis l'espace de partage Ekylibre et la copier dans `/opt/proj/share/`.
>
> ```bash
> sudo mkdir -p /opt/proj/share
> # extraire proj.tar.gz dans /opt/proj/share/
> ```
>
> La marche-à-suivre détaillée se trouve dans la page [Résolution de problèmes](/techdoc/install/troubleshooting/#proj).

## 5. Java 8 & Redis & dépendances système {#java-redis}

Ekylibre embarque des outils Java pour la génération de PDF (clôtures d'exercice, bordereaux).

### a. Repos additionnels (Qt 4 pour openjdk-8 sur 20.04)

```bash
sudo add-apt-repository ppa:rock-core/qt4
sudo apt update
sudo apt install -y libqtcore4
```

### b. Dépendances complètes

```bash
sudo apt install -y \
  imagemagick graphicsmagick \
  libproj-dev libgeos-dev libgeos++-dev \
  libffi-dev libicu-dev libpq-dev \
  openjdk-8-jdk libqtwebkit-dev \
  tesseract-ocr pdftk
```

### c. Exporter `JAVA_HOME`

```bash
echo 'export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64' >> ~/.bashrc
echo 'export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64' >> ~/.profile
source ~/.bashrc
```

Vérification :

```bash
java -version
# openjdk version "1.8.0_xxx"
```

### d. Redis (déjà installé en §1.c, vérifier)

```bash
systemctl status redis-server
# active (running)
```

## 6. Certificats Renater (intégrations PFI) {#renater}

L'API PFI (PostgreSQL Fédération d'identité) utilise des certificats Renater non inclus dans Ubuntu 20.04. À installer **uniquement** si vous comptez utiliser cette intégration :

```bash
sudo wget https://services.renater.fr/_media/tcs/geant_ov_rsa_ca_4_usertrust_rsa_certification_authority.pem \
  -O /usr/local/share/ca-certificates/geant_ov_rsa_ca_4_usertrust_rsa_certification_authority.crt

sudo wget https://services.renater.fr/_media/tcs/geant_ov_rsa_ca_4.pem \
  -O /usr/local/share/ca-certificates/geant_ov_rsa_ca_4.crt

sudo update-ca-certificates
```

## Étape suivante

L'environnement système est prêt. Passez au [**Setup de l'application Ekylibre**](/techdoc/install/app-setup/) (clone du repo, bundle, base de données, lexicon, premier run).
