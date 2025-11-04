# 🚀 Démarrage Complet - Email Software

## ✅ Corrections Appliquées

Toutes les erreurs TypeScript ont été corrigées :
- ✅ `workers/index.ts` - Syntaxe logger Pino corrigée
- ✅ Build Next.js réussi
- ✅ Type-check passé sans erreurs

---

## 📋 Prérequis

Avant de démarrer, vous avez besoin de :

### 1. Services Requis
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **Node.js** 18+ (déjà installé)

### 2. Fichiers de Configuration
- ✅ `.env` (créé depuis `.env.example`)
- ✅ `docker-compose.yml` (créé)

---

## 🎯 Méthode Rapide : Utiliser le Script Automatique

### Windows PowerShell
```powershell
# Lancer le script de démarrage complet
.\start-app.ps1
```

Ce script fait tout automatiquement :
1. ✅ Vérifie la configuration
2. ✅ Démarre PostgreSQL + Redis via Docker
3. ✅ Installe les dépendances
4. ✅ Génère le client Prisma
5. ✅ Initialise la base de données
6. ✅ Lance l'application

---

## 🔧 Méthode Manuelle : Installation Pas à Pas

### Étape 1 : Installer les Services

#### Option A - Docker (Recommandé)
```powershell
# Démarrer PostgreSQL + Redis
docker-compose up -d

# Vérifier que les services fonctionnent
docker-compose ps
```

#### Option B - Installation Manuelle
Consultez le fichier `INSTALLATION_SERVICES.md` pour les instructions détaillées.

### Étape 2 : Vérifier les Services

```powershell
# Tester PostgreSQL (port 5432)
Test-NetConnection -ComputerName localhost -Port 5432

# Tester Redis (port 6379)
Test-NetConnection -ComputerName localhost -Port 6379
```

### Étape 3 : Configuration .env

Vérifier que le fichier `.env` contient les bonnes valeurs :

```env
# Database
DATABASE_URL="postgresql://postgres:password123@localhost:5432/emailapp"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth & Security
SESSION_SECRET="votre-secret-genere"
ENCRYPTION_KEY="votre-cle-hex-generee"

# IMAP (pour inbox)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="votre-email@gmail.com"
IMAP_PASS="votre-app-password"
REPLY_DOMAIN="votredomain.com"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Générer les secrets :**
```powershell
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Étape 4 : Installer les Dépendances

```powershell
# Si ce n'est pas déjà fait
npm install
```

### Étape 5 : Initialiser la Base de Données

```powershell
# Générer le client Prisma
npx prisma generate

# Créer les tables
npx prisma db push

# Charger les données de test (optionnel)
npm run db:seed
```

### Étape 6 : Lancer l'Application

#### Terminal 1 - Application Web
```powershell
# Mode développement
npm run dev

# OU mode production
npm run build
npm start
```

#### Terminal 2 - Workers (Background Jobs)
```powershell
npm run worker:all
```

---

## 🌐 Accès à l'Application

Une fois lancée :

- **Application Web** : http://localhost:3000
- **Login par défaut** : 
  - Email : `admin@acme.com`
  - Mot de passe : `Pass456@`

---

## 🛠️ Outils Disponibles

### Prisma Studio (Interface Base de Données)
```powershell
npm run db:studio
# Ouvre http://localhost:5555
```

### Vérification TypeScript
```powershell
npm run type-check
```

### Linter
```powershell
npm run lint
```

### Tests
```powershell
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

---

## 📊 Statut des Services

### Vérifier les Services Docker
```powershell
# Voir tous les conteneurs
docker-compose ps

# Logs PostgreSQL
docker-compose logs postgres

# Logs Redis
docker-compose logs redis

# Logs en temps réel
docker-compose logs -f
```

### Arrêter les Services
```powershell
# Arrêter sans supprimer les données
docker-compose stop

# Arrêter et supprimer les conteneurs
docker-compose down

# Arrêter et SUPPRIMER LES DONNÉES
docker-compose down -v
```

---

## 🔍 Troubleshooting

### Problème 1 : "ECONNREFUSED localhost:6379"
**Cause** : Redis n'est pas démarré

**Solution** :
```powershell
# Avec Docker
docker-compose up -d redis

# Vérifier
Test-NetConnection localhost -Port 6379
```

### Problème 2 : "ECONNREFUSED localhost:5432"
**Cause** : PostgreSQL n'est pas démarré

**Solution** :
```powershell
# Avec Docker
docker-compose up -d postgres

# Vérifier
Test-NetConnection localhost -Port 5432
```

### Problème 3 : Erreurs TypeScript
**Solution** :
```powershell
# Vérifier les erreurs
npm run type-check

# Toutes les erreurs sont déjà corrigées dans cette version
```

### Problème 4 : Port déjà utilisé
**Cause** : Un autre service utilise le port 3000, 5432 ou 6379

**Solution** :
```powershell
# Trouver le processus sur le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacer PID)
taskkill /PID <PID> /F

# OU changer le port dans package.json
# "dev": "next dev -p 3001"
```

### Problème 5 : Prisma Client non généré
**Solution** :
```powershell
npx prisma generate
```

### Problème 6 : Base de données non initialisée
**Solution** :
```powershell
# Réinitialiser complètement
npx prisma db push --force-reset

# Recharger les données de test
npm run db:seed
```

---

## 📚 Documentation Complémentaire

- **Installation Services** : `INSTALLATION_SERVICES.md`
- **Guide Démarrage** : `GUIDE_DEMARRAGE.md`
- **Déploiement Production** : `DEPLOIEMENT_RENDER.md`
- **Architecture** : `README.md`

---

## 🎯 Checklist Avant Démarrage

- [ ] PostgreSQL est démarré (port 5432)
- [ ] Redis est démarré (port 6379)
- [ ] Fichier `.env` configuré
- [ ] Secrets générés dans `.env`
- [ ] Dépendances installées (`npm install`)
- [ ] Client Prisma généré (`npx prisma generate`)
- [ ] Base de données initialisée (`npx prisma db push`)
- [ ] Données de test chargées (`npm run db:seed`)

---

## 🚀 Commandes Rapides

```powershell
# Démarrage complet automatique
.\start-app.ps1

# Démarrage manuel
docker-compose up -d          # Services
npm run dev                   # Terminal 1 - Web
npm run worker:all            # Terminal 2 - Workers

# Arrêt
Ctrl+C                        # Dans chaque terminal
docker-compose down           # Arrêter les services
```

---

## ✨ Fonctionnalités Disponibles

Une fois l'application lancée, vous pouvez :

### Dashboard
- 📊 Voir les métriques en temps réel
- 🔴 Toggle Kill Switch
- 📈 Graphiques de délivrabilité

### Envoi d'Emails
- ✉️ Composer et envoyer des emails
- 🎯 Routage SMTP intelligent
- 📋 Préflight checks automatiques
- 📊 Explication du choix de SMTP

### Inbox
- 📥 Réception d'emails via IMAP
- 💬 Threading des conversations
- 🔒 HTML sanitisé

### Historique
- 📜 Tous les envois
- 🔍 Détails des tentatives
- 📊 Statuts et erreurs

### Settings
- 🔧 Comptes SMTP
- 👤 Identités
- 🌐 Configuration DNS
- 🔐 DKIM & DMARC
- ⚙️ Rate limits

---

## 💡 Conseils

1. **Développement** : Utilisez `npm run dev` pour le hot-reload
2. **Production** : Utilisez `npm run build` puis `npm start`
3. **Workers** : Toujours lancer les workers en parallèle de l'application
4. **Logs** : Utilisez Prisma Studio pour inspecter la base de données
5. **Docker** : Utilisez Docker pour éviter les problèmes d'installation

---

## 🎉 C'est Parti !

L'application est prête à être lancée. Utilisez :

```powershell
.\start-app.ps1
```

Bon développement ! 🚀
