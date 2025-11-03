# 🚀 Guide de Déploiement sur Render.com

Ce guide vous accompagne étape par étape pour déployer **Email Software Complet** sur Render.com avec PostgreSQL et Redis.

---

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Préparation du Repository GitHub](#préparation-github)
3. [Configuration Render.com](#configuration-render)
4. [Variables d'Environnement](#variables-denvironnement)
5. [Déploiement](#déploiement)
6. [Post-Déploiement](#post-déploiement)
7. [Monitoring](#monitoring)
8. [Dépannage](#dépannage)

---

## ✅ Prérequis

### Comptes Requis
- ✅ Compte GitHub (gratuit)
- ✅ Compte Render.com (gratuit pour commencer)

### Connaissances Requises
- Utilisation basique de Git
- Accès à un terminal/ligne de commande
- (Optionnel) Comptes SMTP (AWS SES, Titan, ou autre)

---

## 📦 Préparation GitHub

### 1. Initialiser Git (si pas déjà fait)

```bash
cd c:\Users\Administrator\Desktop\Email-Software-complet

# Initialiser le repository
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit: Email Software Complet v1.0"
```

### 2. Créer un Repository GitHub

1. Aller sur https://github.com
2. Cliquer sur **"New repository"**
3. Nom: `email-software-complet`
4. Description: `Full-stack email management platform with intelligent SMTP routing`
5. **Visibilité:** Private (recommandé) ou Public
6. **NE PAS** initialiser avec README (déjà présent)
7. Cliquer **"Create repository"**

### 3. Pousser sur GitHub

```bash
# Ajouter remote origin
git remote add origin https://github.com/VOTRE-USERNAME/email-software-complet.git

# Pousser le code
git branch -M main
git push -u origin main
```

✅ **Vérification:** Votre code doit maintenant être visible sur GitHub

---

## ⚙️ Configuration Render.com

### 1. Créer un Compte Render

1. Aller sur https://render.com
2. S'inscrire avec GitHub (recommandé)
3. Autoriser Render à accéder à vos repos

### 2. Option A : Déploiement avec Blueprint (Recommandé)

Le fichier `render.yaml` configure tout automatiquement.

#### Étapes :

1. Dans Render Dashboard, cliquer **"New +"**
2. Sélectionner **"Blueprint"**
3. Connecter votre repository GitHub `email-software-complet`
4. Render détectera automatiquement `render.yaml`
5. Cliquer **"Apply"**

✅ Render va créer automatiquement :
- ✅ Service Web (Next.js)
- ✅ Service Workers (BullMQ)
- ✅ PostgreSQL Database
- ✅ Redis Instance

### 2. Option B : Déploiement Manuel

Si vous préférez configurer manuellement :

#### A. Créer PostgreSQL

1. **New +** → **PostgreSQL**
2. **Name:** `email-software-db`
3. **Database:** `emailapp`
4. **User:** `emailapp`
5. **Region:** Oregon (ou proche de vous)
6. **Plan:** Starter (gratuit)
7. Cliquer **"Create Database"**

📝 **Noter l'URL de connexion** (Internal Database URL)

#### B. Créer Redis

1. **New +** → **Redis**
2. **Name:** `email-software-redis`
3. **Region:** Oregon
4. **Plan:** Starter (gratuit)
5. **Maxmemory Policy:** `noeviction`
6. Cliquer **"Create Redis"**

📝 **Noter l'URL de connexion** (Internal Redis URL)

#### C. Créer Web Service

1. **New +** → **Web Service**
2. **Connect repository:** `email-software-complet`
3. **Name:** `email-software-web`
4. **Region:** Oregon
5. **Branch:** `main`
6. **Root Directory:** (laisser vide)
7. **Environment:** `Node`
8. **Build Command:**
   ```bash
   npm install && npx prisma generate && npm run build
   ```
9. **Start Command:**
   ```bash
   npm start
   ```
10. **Plan:** Starter ($7/mois) ou Free (limité)
11. Ajouter les variables d'environnement (voir section suivante)
12. Cliquer **"Create Web Service"**

#### D. Créer Workers Service

1. **New +** → **Background Worker**
2. **Connect repository:** `email-software-complet`
3. **Name:** `email-software-workers`
4. **Region:** Oregon
5. **Branch:** `main`
6. **Build Command:**
   ```bash
   npm install && npx prisma generate
   ```
7. **Start Command:**
   ```bash
   npm run worker:all
   ```
8. **Plan:** Starter ($7/mois)
9. Ajouter les mêmes variables d'environnement
10. Cliquer **"Create Background Worker"**

---

## 🔐 Variables d'Environnement

### Variables Requises (Web Service)

Aller dans **Environment** de votre Web Service :

```env
# Database (auto-rempli si Blueprint)
DATABASE_URL=<copier depuis PostgreSQL Internal URL>

# Redis (auto-rempli si Blueprint)
REDIS_URL=<copier depuis Redis Internal URL>

# Security - GÉNÉRER DES VALEURS UNIQUES
SESSION_SECRET=<générer 32+ chars aléatoires>
ENCRYPTION_KEY=<générer avec commande ci-dessous>

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://VOTRE-APP.onrender.com

# IMAP (Optionnel - pour inbox)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=votre-email@gmail.com
IMAP_PASS=votre-mot-de-passe-app
REPLY_DOMAIN=votredomaine.com

# AWS SES (Optionnel)
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=
SES_SECRET_ACCESS_KEY=

# Titan Email (Optionnel)
TITAN_HOST=smtp.titan.email
TITAN_PORT=587
TITAN_USER=
TITAN_PASS=

# Route53 (Optionnel - auto DNS)
ROUTE53_ACCESS_KEY_ID=
ROUTE53_SECRET_ACCESS_KEY=
ROUTE53_REGION=us-east-1

# Cloudflare (Optionnel - auto DNS)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
```

### Générer ENCRYPTION_KEY

Sur votre machine locale :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copier la sortie (64 caractères) dans `ENCRYPTION_KEY`

### Générer SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copier la sortie dans `SESSION_SECRET`

---

## 🚀 Déploiement

### 1. Déclencher le Build

Le déploiement démarre automatiquement après :
- ✅ Push sur GitHub (branch `main`)
- ✅ Configuration des variables d'environnement
- ✅ Click sur **"Manual Deploy"** dans Render

### 2. Suivre les Logs

Dans Render Dashboard :
1. Cliquer sur votre service `email-software-web`
2. Onglet **"Logs"**
3. Surveiller la progression :
   ```
   ==> Installing dependencies...
   ==> Building application...
   ==> Generating Prisma Client...
   ==> Build successful ✓
   ==> Starting server...
   ```

⏱️ **Temps estimé:** 5-10 minutes

### 3. Vérifier le Déploiement

Une fois déployé :

```bash
# Health check
curl https://VOTRE-APP.onrender.com/api/health

# Devrait retourner:
{"status":"ok"}
```

---

## 📊 Post-Déploiement

### 1. Initialiser la Base de Données

#### Option A : Via Render Shell

1. Dans Render Dashboard → `email-software-web`
2. Onglet **"Shell"**
3. Exécuter :
   ```bash
   npx prisma db push
   npm run db:seed
   ```

#### Option B : Via PostgreSQL Client

1. Télécharger les credentials PostgreSQL
2. Connecter avec psql ou pgAdmin
3. Exécuter le script SQL depuis `prisma/schema.prisma`

### 2. Vérifier l'Utilisateur Admin

```bash
# Dans Shell Render
npx prisma studio
```

Ou connectez-vous directement :
- **URL:** https://VOTRE-APP.onrender.com/login
- **Email:** admin@acme.com
- **Password:** Pass456@

### 3. Configurer DNS (Production)

Pour envoyer des emails, configurez vos enregistrements DNS :

#### SPF Record
```
v=spf1 include:amazonses.com include:_spf.titan.email ~all
```

#### DKIM Record
Généré automatiquement via `/settings` → DNS

#### DMARC Record
```
v=DMARC1; p=none; rua=mailto:dmarc@votredomaine.com
```

### 4. Ajouter un Compte SMTP

1. Login sur https://VOTRE-APP.onrender.com
2. Aller dans **Settings** → **SMTP Accounts**
3. Ajouter AWS SES ou Titan
4. Tester la connexion

---

## 📈 Monitoring

### Métriques Prometheus

Accessible sur : `https://VOTRE-APP.onrender.com/api/metrics`

**Intégrations possibles :**
- Grafana Cloud (gratuit)
- Prometheus + Alert Manager
- Datadog
- New Relic

### Logs

**Render Logs:**
- Dashboard → Service → Logs
- Filtrer par niveau (info, error)
- Télécharger pour analyse

**Structured Logs (Pino):**
```bash
# Chercher erreurs
grep "error" logs.txt

# Chercher envois
grep "Email sent" logs.txt
```

### Health Checks

Render ping automatiquement `/api/health` :
- ✅ Vert = Service OK
- ❌ Rouge = Service down
- 🟡 Jaune = Démarrage

---

## 🔧 Dépannage

### Erreur : "ECONNREFUSED" Redis

**Cause:** Redis URL incorrecte ou service non démarré

**Solution:**
1. Vérifier `REDIS_URL` dans Environment
2. Copier l'**Internal URL** (pas External)
3. Format attendu : `redis://red-xxx:6379`

### Erreur : Prisma "Can't reach database"

**Cause:** DATABASE_URL incorrecte

**Solution:**
1. Vérifier `DATABASE_URL` dans Environment
2. Copier l'**Internal URL** PostgreSQL
3. Format attendu : `postgresql://user:pass@host:5432/db`

### Erreur : "ENCRYPTION_KEY must be 32 bytes"

**Cause:** ENCRYPTION_KEY mal formatée

**Solution:**
```bash
# Regénérer
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Doit faire **exactement 64 caractères hexadécimaux**

### Workers ne démarrent pas

**Cause:** Redis inaccessible ou mauvaise commande

**Solution:**
1. Vérifier `REDIS_URL` dans Workers Service
2. Vérifier Start Command : `npm run worker:all`
3. Checker logs Workers pour erreur spécifique

### Build échoue avec "Out of memory"

**Cause:** Plan gratuit/starter trop limité

**Solution:**
1. Upgrader vers plan Standard
2. Ou optimiser build :
   ```bash
   NODE_OPTIONS='--max-old-space-size=2048' npm run build
   ```

### Sessions ne persistent pas

**Cause:** Redis non connecté ou SESSION_SECRET change

**Solution:**
1. Vérifier Redis UP dans Dashboard
2. SESSION_SECRET doit être **fixe** (ne pas regénérer)
3. Cookies require HTTPS en production

---

## 🔄 Mises à Jour

### Déployer une Nouvelle Version

```bash
# Local
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# Render auto-deploy si activé
# Sinon, cliquer "Manual Deploy" dans Dashboard
```

### Rollback en Cas de Problème

1. Dashboard → Service → **Deploys**
2. Trouver le deploy précédent qui fonctionnait
3. Cliquer **"Redeploy"**

---

## 💰 Coûts Estimés

### Plan Gratuit
- Web Service : Free tier (limité)
- PostgreSQL : Free tier (limité)
- Redis : Pas de tier gratuit
- **Total:** Impossible (Redis requis)

### Plan Starter (Minimum)
- Web Service : $7/mois
- Worker Service : $7/mois
- PostgreSQL Starter : Gratuit
- Redis Starter : $3/mois
- **Total:** ~$17/mois

### Plan Recommandé Production
- Web Service Standard : $25/mois
- Worker Service Standard : $25/mois
- PostgreSQL Standard : $7/mois
- Redis Standard : $10/mois
- **Total:** ~$67/mois

---

## 📚 Ressources

### Documentation Render
- https://render.com/docs
- https://render.com/docs/deploy-nextjs
- https://render.com/docs/databases

### Email Software Docs
- `README.md` - Vue d'ensemble
- `GUIDE_DEMARRAGE.md` - Guide local
- `RAPPORT_CORRECTIONS_FINALES.md` - Corrections

### Support
- Render Support : https://render.com/support
- GitHub Issues : (votre repo)

---

## ✅ Checklist Finale

Avant de passer en production :

- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ DATABASE_URL pointe vers PostgreSQL
- [ ] ✅ REDIS_URL pointe vers Redis
- [ ] ✅ ENCRYPTION_KEY généré (64 chars hex)
- [ ] ✅ SESSION_SECRET généré (32+ chars)
- [ ] ✅ NEXT_PUBLIC_APP_URL configuré
- [ ] ✅ Base de données initialisée (`db:push`)
- [ ] ✅ Seed exécuté (`db:seed`)
- [ ] ✅ Login admin fonctionne
- [ ] ✅ Dashboard affiche stats
- [ ] ✅ SMTP account ajouté
- [ ] ✅ DNS configuré (SPF/DKIM/DMARC)
- [ ] ✅ Test envoi email OK
- [ ] ✅ Workers running (check logs)
- [ ] ✅ Health check OK
- [ ] ✅ Metrics accessibles
- [ ] ✅ HTTPS activé (auto par Render)

---

🎉 **Félicitations ! Votre application est en production sur Render.com !**
