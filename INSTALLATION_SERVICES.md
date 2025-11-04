# Installation des Services Requis

## Services Nécessaires

L'application nécessite 3 services pour fonctionner :
1. **PostgreSQL** (Base de données)
2. **Redis** (Cache et queues)
3. **Node.js** (Application)

---

## Option 1 : Installation avec Docker (Recommandé)

### 1. Installer Docker Desktop
- Télécharger : https://www.docker.com/products/docker-desktop
- Installer et redémarrer l'ordinateur

### 2. Créer le fichier docker-compose.yml (déjà présent dans le projet)

### 3. Lancer les services
```bash
docker-compose up -d
```

---

## Option 2 : Installation Manuelle (Windows)

### 1. Installer PostgreSQL

**Téléchargement :**
- Site officiel : https://www.postgresql.org/download/windows/
- Ou via installeur : https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

**Installation :**
1. Lancer l'installeur
2. Choisir le port 5432 (par défaut)
3. Définir un mot de passe pour l'utilisateur `postgres`
4. Créer une base de données `emailapp`

**Commandes PostgreSQL :**
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE emailapp;

# Créer un utilisateur (optionnel)
CREATE USER emailuser WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE emailapp TO emailuser;
```

**Mettre à jour .env :**
```env
DATABASE_URL="postgresql://postgres:votre_mot_de_passe@localhost:5432/emailapp"
```

### 2. Installer Redis

**Option A : Redis via Windows Subsystem for Linux (WSL)**
```bash
# Dans WSL
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis

# Démarrer Redis
sudo service redis-server start
```

**Option B : Redis via Memurai (alternative Windows)**
- Télécharger : https://www.memurai.com/get-memurai
- Installer et démarrer le service

**Option C : Redis via Docker (sans docker-compose)**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Mettre à jour .env :**
```env
REDIS_URL="redis://localhost:6379"
```

---

## Vérification des Services

### PostgreSQL
```bash
# Test de connexion
psql -U postgres -d emailapp

# Ou via PowerShell
Test-NetConnection -ComputerName localhost -Port 5432
```

### Redis
```bash
# Test de connexion (si redis-cli installé)
redis-cli ping
# Devrait retourner "PONG"

# Ou via PowerShell
Test-NetConnection -ComputerName localhost -Port 6379
```

---

## Option 3 : Utilisation de Docker Compose (Le Plus Simple)

### 1. Créer docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: emailapp-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: emailapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: emailapp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2. Démarrer les services
```bash
docker-compose up -d
```

### 3. Arrêter les services
```bash
docker-compose down
```

### 4. Voir les logs
```bash
docker-compose logs -f
```

---

## Configuration .env

Après l'installation des services, vérifier le fichier `.env` :

```env
# Database
DATABASE_URL="postgresql://postgres:password123@localhost:5432/emailapp"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth & Security (générer avec les commandes ci-dessous)
SESSION_SECRET="votre-secret-32-chars-min"
ENCRYPTION_KEY="votre-cle-hex-32-bytes"

# IMAP (pour la réception d'emails)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="votre-email@gmail.com"
IMAP_PASS="votre-mot-de-passe-app"
REPLY_DOMAIN="votredomaine.com"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Générer les secrets :
```bash
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Initialisation de la Base de Données

```bash
# 1. Générer le client Prisma
npx prisma generate

# 2. Créer les tables
npx prisma db push

# 3. (Optionnel) Charger les données de test
npm run db:seed
```

---

## Démarrage de l'Application

### Développement
```bash
# Terminal 1 - Application Web
npm run dev

# Terminal 2 - Workers (background jobs)
npm run worker:all
```

### Production
```bash
# Build
npm run build

# Démarrer
npm start

# Workers (dans un autre terminal)
npm run worker:all
```

---

## Troubleshooting

### PostgreSQL ne démarre pas
- Vérifier que le port 5432 n'est pas déjà utilisé
- Vérifier les logs : `docker logs emailapp-postgres` (si Docker)
- Windows : Vérifier le service dans `services.msc`

### Redis ne démarre pas
- Vérifier que le port 6379 n'est pas déjà utilisé
- Vérifier les logs : `docker logs emailapp-redis` (si Docker)

### L'application ne se connecte pas
- Vérifier que les services sont en cours d'exécution
- Vérifier les variables d'environnement dans `.env`
- Vérifier les URLs de connexion (localhost vs 127.0.0.1)

### Erreur "ECONNREFUSED"
- Les services Redis/PostgreSQL ne sont pas démarrés
- Vérifier avec : `Test-NetConnection localhost -Port 6379` (Redis)
- Vérifier avec : `Test-NetConnection localhost -Port 5432` (PostgreSQL)

---

## URLs Utiles

- **Application Web** : http://localhost:3000
- **Prisma Studio** (DB Admin) : `npm run db:studio` puis http://localhost:5555
- **BullMQ Dashboard** : Sera accessible via l'app (si configuré)

---

## Commandes Utiles

```bash
# Voir les logs de l'application
npm run dev

# Voir les logs des workers
npm run worker:all

# Accéder à la base de données
npm run db:studio

# Réinitialiser la base de données
npx prisma db push --force-reset

# Tester la connexion Redis
redis-cli ping

# Tester la connexion PostgreSQL
psql -U postgres -d emailapp
```
