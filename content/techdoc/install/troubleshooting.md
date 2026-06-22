---
title: Résolution de problèmes
nav_title: Troubleshooting
sort_rank: 19
nav_icon: medkit
toc: full
---

# Résolution de problèmes

Erreurs fréquentes et solutions, regroupées par symptôme.

## Native Ubuntu

### PostGIS — `ERROR: source code not in proj.4 format` {#proj}

La version de PROJ installée par Ubuntu 20.04 est parfois trop récente pour la version de PostGIS embarquée.

1. Vérifier la version de PROJ installée :
   ```bash
   dpkg -l | grep ^ii.*proj
   ```
2. Si version ≥ 5.2.0 et erreur au démarrage de Rails :
   - Récupérer un snapshot compatible de `proj.tar.gz` auprès d'un autre développeur Ekylibre
   - Extraire et déposer dans `/opt/proj/share/` :
     ```bash
     sudo mkdir -p /opt/proj/share
     sudo tar -xzf proj.tar.gz -C /opt/proj/share
     ```
3. Définir la variable d'environnement avant de lancer Rails :
   ```bash
   export PROJ_LIB=/opt/proj/share
   bundle exec rails s
   ```

### PostgreSQL — `FATAL: Peer authentication failed`

`pg_hba.conf` utilise par défaut l'authentification `peer` pour les connexions Unix socket. Ekylibre s'attend à `md5`.

Éditer :

```bash
sudo vim /etc/postgresql/13/main/pg_hba.conf
```

Remplacer :

```
local   all             all                                peer
```

par :

```
local   all             all                                md5
```

Puis :

```bash
sudo systemctl restart postgresql
```

### `bundle install` échoue sur `nokogiri` ou `rgeo`

Mettre à jour Bundler :

```bash
gem install bundler -v '>= 2.3'
```

Si l'erreur persiste, installer les en-têtes manquants :

```bash
sudo apt install -y libxml2-dev libxslt1-dev libgeos-dev libgeos++-dev libproj-dev
```

### Java introuvable au démarrage

Vérifier `JAVA_HOME` :

```bash
echo $JAVA_HOME
# Doit retourner /usr/lib/jvm/java-8-openjdk-amd64
```

Si vide :

```bash
echo 'export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc
```

## Docker dev

### Permissions sur `vendor/bundle` ou `/app`

Le container écrit avec son UID interne. Si votre UID hôte n'est pas `1000`, les fichiers créés appartiennent à un user inexistant.

Vérifier votre UID/GID :

```bash
id
# uid=1001(djoulin) gid=1001(djoulin) ...
```

Renseigner dans `docker/dev/.env` :

```dotenv
UID=1001
GID=1001
```

Supprimer les volumes et rebuilder :

```bash
docker volume rm dev_bundle-volume dev_docker-dev
docker compose -f docker/dev/docker-compose.yml build --no-cache
```

### Warning Redis `Memory overcommit must be enabled`

Sur l'hôte Linux :

```bash
sudo sysctl vm.overcommit_memory=1
echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf
```

### Image de base inaccessible (`403 Forbidden`)

Certains pipelines historiques pointent encore sur `registry.gitlab.com`. S'authentifier :

```bash
docker login registry.gitlab.com
# Login: <votre-username-gitlab>
# Password: <Personal Access Token avec scope read_registry>
```

### `https://ekylibre.localhost/` non joignable / cert invalide

Faire confiance à la CA Caddy :

```bash
sudo apt install -y libnss3-tools
docker/dev/trust-ca.sh
```

**Redémarrer le navigateur** après. Voir [Docker dev §6](/techdoc/install/docker-dev/).

## Docker prod

### Caddy ne provisionne pas de cert

Vérifier dans l'ordre :

1. **Ports 80/443 ouverts depuis Internet** (challenge ACME) — tester depuis votre poste (pas depuis le serveur) :
   ```bash
   curl -I http://example.com/
   ```

2. **DNS du domaine ET du wildcard** pointent vers le serveur :
   ```bash
   dig +short example.com
   dig +short acme.example.com
   ```
   Les deux doivent renvoyer l'IP du serveur.

3. **L'`ask` endpoint répond** (filtre `on_demand_tls`) :
   ```bash
   docker compose -f docker/prod/docker-compose.yml exec caddy \
     wget -O- http://app:3000/health
   # Attendu : ok
   ```
   Si pas accessible : vérifier que `app` est healthy et que les containers sont sur le même réseau.

4. **Logs Caddy** :
   ```bash
   docker compose -f docker/prod/docker-compose.yml logs caddy \
     | grep -iE "obtain|challenge|error" | tail -20
   ```

5. **Rate-limit Let's Encrypt atteint** (50 certs/semaine/domaine racine) :
   - Si `urn:ietf:params:acme:error:rateLimited` → attendre 7 jours
   - Ou basculer en challenge DNS-01 wildcard (voir [doc Caddy](https://caddyserver.com/docs/automatic-https#dns-challenge))

### Lexicon n'est pas chargé

```bash
./docker/prod/scripts/lexicon-reload.sh
```

### `SECRET_KEY_BASE is empty`

Générer un secret et l'ajouter au `.env` :

```bash
echo "SECRET_KEY_BASE=$(openssl rand -hex 64)" >> docker/prod/.env
```

### App container redémarre en boucle

Le healthcheck a `start_period: 600s` (10 min) pour laisser le temps au lexicon de charger. Si l'app redémarre quand même :

```bash
# DB joignable ?
docker compose -f docker/prod/docker-compose.yml exec db pg_isready -U ekylibre

# Logs détaillés
docker compose -f docker/prod/docker-compose.yml logs --tail=200 app
```

### Duke renvoie 502

- Vérifier que le profile Duke est actif :
  ```bash
  docker compose -f docker/prod/docker-compose.yml ps
  ```
- Logs Duke :
  ```bash
  docker compose -f docker/prod/docker-compose.yml --profile duke logs -f duke-api
  ```
- Vérifier `HASH_SECRET` non-vide et au moins une clé LLM (`ANTHROPIC_API_KEY` ou `MISTRAL_API_KEY`) renseignée

## App / data

### `Lexicon::ProductionNature.count == 0`

Le lexicon ne s'est pas chargé. Relancer :

- **Native** : `bin/rake lexicon:load`
- **Docker dev** : `docker compose -f docker/dev/docker-compose.yml exec app bundle exec rake lexicon:load`
- **Docker prod** : `./docker/prod/scripts/lexicon-reload.sh`

### Tenant inaccessible — `Apartment::TenantNotFound`

Le tenant n'existe pas ou son nom dans l'URL ne correspond pas. Lister les tenants :

```bash
bundle exec rails runner "puts Apartment::Tenant.list"
```

Créer un tenant manquant :

```bash
# Native
bin/rake tenant:init TENANT=my-farm
# Docker
./docker/prod/scripts/tenant-init.sh my-farm admin@my-farm.com 'MotDePasse!'
```

### Sidekiq ne traite pas les jobs

Vérifier qu'il tourne :

```bash
# Native
ps aux | grep sidekiq

# Docker
docker compose -f docker/dev/docker-compose.yml ps sidekiq
```

Vérifier la connexion Redis depuis Sidekiq :

```bash
docker compose -f docker/dev/docker-compose.yml exec sidekiq \
  bundle exec rails runner "puts Sidekiq.redis(&:ping)"
# PONG
```

## Vous ne trouvez pas votre erreur ?

- Forum Discord : [https://discord.gg/BSpD6hq7qR](https://discord.gg/BSpD6hq7qR)
- Issues GitHub : [https://github.com/ekylibre/ekylibre/issues](https://github.com/ekylibre/ekylibre/issues)

Quand vous demandez de l'aide, joignez systématiquement :

- Variante d'installation utilisée
- Branche / commit (`git rev-parse HEAD`)
- Sortie complète de l'erreur
- Sortie de `docker compose ... ps` (variantes Docker) ou `systemctl status postgresql redis-server` (native)
