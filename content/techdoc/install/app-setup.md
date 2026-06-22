---
title: Setup de l'application
nav_title: Setup application
sort_rank: 14
nav_icon: cogs
toc: full
---

# Setup de l'application Ekylibre

Cette page décrit la mise en route de l'application **après** que l'environnement système est prêt (voir [Native Ubuntu](/techdoc/install/native-ubuntu/) ou Docker). On y clone le repo, installe les dépendances Ruby/JS, configure `.env`, initialise la base, charge le lexicon, et démarre les serveurs.

## Barre de progression interactive

<div id="install-progress" class="techdoc-pixi-progress" data-pixi-component="install-progress" data-steps="clone,bundle,env,db,gpg,lexicon,first-run,start" aria-hidden="true"></div>

<script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js" defer></script>
<script src="/javascripts/techdoc-install-progress.js" defer></script>

## 1. Cloner le dépôt {#clone}

```bash
mkdir -p ~/projects && cd ~/projects
git clone -b 5.0-beta https://github.com/ekylibre/ekylibre.git
cd ekylibre
```

Si vous travaillez sur la version GitLab privée :

```bash
git clone -b 5.0-beta git@gitlab.com:ekylibre/eky.git
```

## 2. Installer les dépendances Ruby et JS {#bundle}

```bash
bundle install
yarn install
```

> **Important :** plusieurs plugins privés sont déclarés via `Gemfile.local`. Si vous n'avez pas accès aux dépôts privés (`github.com/ekylibre/ekylibre-banking` etc.), commentez les lignes correspondantes dans `Gemfile.local` avant de relancer `bundle install`.

> **Astuce :** `bundle install` échoue parfois sur `nokogiri` / `rgeo` avec une vieille version de `bundler`. Mettre à jour :
> ```bash
> gem install bundler -v '>= 2.3'
> ```

## 3. Copier et compléter `.env` {#env}

```bash
cp .env.dist .env
```

Le fichier `.env.dist` contient des secrets de **développement uniquement** (clés Devise, secret base). Pour le dev local, vous pouvez le laisser tel quel.

Quelques variables clés :

| Variable | Valeur dev | Description |
|---|---|---|
| `DEVISE_SECRET_KEY` | (fournie) | Authentification utilisateurs |
| `SECRET_KEY_BASE` | (fournie) | Chiffrement des cookies Rails |
| `GPG_EMAIL` | Email de votre clé GPG (voir §5) | Signature des documents |
| `MAILER_SENDER` | `sender-is-not-defined@example.org` | Émetteur des emails |

> **En production :** régénérer **tous** les secrets avec `openssl rand -hex 64`, restreindre `chmod 600 .env`, et **ne pas** committer.

> **Crédentials d'API tierces** (Saisigo, Baqio, Qonto…) : demandez-les à un autre développeur Ekylibre. Sans ces clés, certaines intégrations seront désactivées (non bloquant pour le démarrage).

## 4. Créer et migrer la base de données {#db}

```bash
bundle exec rails db:create db:migrate
```

Si vous voyez `FATAL: Peer authentication failed`, c'est que `pg_hba.conf` n'a pas été ajusté pour utiliser `md5` — voir §3.c de [Native Ubuntu](/techdoc/install/native-ubuntu/#postgres).

## 5. Générer une clé GPG locale {#gpg}

Ekylibre signe certains documents (clôtures d'exercice, archives) avec GPG.

```bash
gpg --gen-key
```

Suivre les instructions interactives (nom, email, mot de passe). Puis renseigner l'email dans `.env` :

```bash
echo "GPG_EMAIL=votre-email@example.org" >> .env
```

> **Sauter cette étape :** uniquement si vous n'utiliserez pas les fonctionnalités de signature (acceptable en dev exploratoire).

## 6. Charger le lexicon {#lexicon}

Le **lexicon** est la base nomenclaturale d'Ekylibre (variétés végétales, équipements, intrants…) — plus de 20 millions d'items.

```bash
bin/rake lexicon:load
```

> **Cette étape prend 5 à 10 minutes.** Le rake task télécharge des archives depuis un MinIO/S3 si les variables `MINIO_HOST/ACCESS_KEY/SECRET_KEY` sont renseignées dans `.env`, ou utilise le snapshot embarqué sinon.

## 7. Premier run (données de démo OU tenant vierge) {#first-run}

### Option A — Charger les données de démonstration

```bash
mkdir -p db/first_runs
git clone https://github.com/ekylibre/first_run-demo.git db/first_runs/demo
bin/rake first_run
```

Ajouter une entrée dans `/etc/hosts` pour résoudre le tenant `demo` :

```bash
echo '127.0.0.1 demo.ekylibre.lan' | sudo tee -a /etc/hosts
```

### Option B — Créer un tenant vierge

```bash
bin/rake tenant:init TENANT=my-farm
echo '127.0.0.1 my-farm.ekylibre.lan' | sudo tee -a /etc/hosts
```

## 8. Démarrer les serveurs {#start}

Ekylibre nécessite **trois processus** en parallèle (en dev sans Docker, ouvrir trois terminaux ou utiliser `tmux` / `foreman`).

### Terminal 1 — Serveur Rails (Puma)

```bash
bundle exec rails s
```

### Terminal 2 — Worker Sidekiq (jobs asynchrones)

```bash
bundle exec sidekiq
```

### Terminal 3 — Compilation des assets (optionnel pour le dev front)

```bash
bin/webpack-dev-server
```

> Sans `webpack-dev-server`, Rails compile les assets à la volée à la première requête — plus lent mais suffisant pour exploration.

### Accès à l'application

Ouvrir [http://demo.ekylibre.lan:3000](http://demo.ekylibre.lan:3000) (ou `my-farm.ekylibre.lan` selon l'option choisie).

Identifiants par défaut : voir [`db/first_runs/demo/`](https://github.com/ekylibre/first_run-demo) (généralement `admin@ekylibre.org` / `12345678`).

## Vérifications post-installation

```bash
# Console Rails accessible
bundle exec rails c
# loading development environment (Rails 6.x.x)

# Jobs en attente
bundle exec sidekiq-cli status

# Lexicon chargé
bundle exec rails runner "puts Lexicon::ProductionNature.count"
# Doit renvoyer un nombre > 0
```

## Étape suivante

L'installation est complète. Pour comprendre comment les pièces s'agencent, lire [**Architecture**](/techdoc/architecture/). Pour soumettre un correctif, lire [**Contribuer**](/techdoc/contributing/).

En cas d'erreur, consulter [**Résolution de problèmes**](/techdoc/install/troubleshooting/).
