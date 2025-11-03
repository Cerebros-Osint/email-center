# 🚀 Guide de Démarrage Rapide
## Email Software Complet - Version Corrigée

---

## ✅ Étape 1 : Prérequis

Assurez-vous d'avoir installé :
- ✅ **Node.js** ≥ 18
- ✅ **PostgreSQL** ≥ 13 (ou utilisez SQLite pour tests)
- ✅ **Redis** ≥ 6

---

## ⚙️ Étape 2 : Configuration Environnement

### 1. Générer les secrets

```bash
# Générer ENCRYPTION_KEY (32 bytes = 64 chars hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer SESSION_SECRET (min 32 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Créer le fichier `.env`

```bash
cp .env.example .env
```

### 3. Éditer `.env` avec vos valeurs

```env
# ✅ REQUIS
DATABASE_URL="postgresql://user:password@localhost:5432/emailapp"
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="VOTRE_SESSION_SECRET_ICI"
ENCRYPTION_KEY="VOTRE_ENCRYPTION_KEY_64_CHARS_HEX"

# ✅ IMAP pour inbox
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="votre-email@gmail.com"
IMAP_PASS="votre-mot-de-passe-app"
REPLY_DOMAIN="votredomaine.com"

# ✅ Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ⚠️ OPTIONNEL - AWS SES
SES_REGION="us-east-1"
SES_ACCESS_KEY_ID=""
SES_SECRET_ACCESS_KEY=""

# ⚠️ OPTIONNEL - Titan Email
TITAN_HOST="smtp.titan.email"
TITAN_PORT="587"
TITAN_USER=""
TITAN_PASS=""

# ⚠️ OPTIONNEL - Route53 pour DNS auto-publish
ROUTE53_ACCESS_KEY_ID=""
ROUTE53_SECRET_ACCESS_KEY=""
ROUTE53_REGION="us-east-1"

# ⚠️ OPTIONNEL - Cloudflare pour DNS auto-publish
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_ZONE_ID=""
```

---

## 📦 Étape 3 : Installation

```bash
# Installer les dépendances
npm install

# Générer Prisma Client
npx prisma generate

# Pousser le schéma vers la base de données
npx prisma db push

# (Optionnel) Seed avec données de test
npm run db:seed
```

---

## 🚀 Étape 4 : Lancement

### Mode Développement

```bash
# Terminal 1 : Application Next.js
npm run dev

# Terminal 2 : Workers (envoi emails, IMAP, etc.)
npm run worker:all
```

L'application sera disponible sur **http://localhost:3000**

### Mode Production

```bash
# Build
npm run build

# Lancer
npm start

# Workers (dans un terminal séparé)
npm run worker:all
```

---

## 🧪 Étape 5 : Vérification

### 1. Vérifier que tout fonctionne

```bash
# Health check
curl http://localhost:3000/api/health

# Metrics Prometheus
curl http://localhost:3000/api/metrics
```

### 2. Accéder à l'interface

1. Ouvrir http://localhost:3000
2. Créer un compte (premier utilisateur = Owner)
3. Configurer un compte SMTP dans `/settings`
4. Tester l'envoi dans `/send`

---

## 🔍 Dépannage

### Problème : Redis connection refused

**Erreur :**
```
ECONNREFUSED 127.0.0.1:6379
```

**Solution :**
```bash
# Windows
# Installer Redis via WSL ou Docker

# Linux/Mac
redis-server

# Docker
docker run -d -p 6379:6379 redis:alpine
```

---

### Problème : PostgreSQL connection refused

**Erreur :**
```
Can't reach database server
```

**Solution :**
```bash
# Vérifier que PostgreSQL tourne
pg_isready

# Démarrer PostgreSQL
# Windows: Services > PostgreSQL
# Linux: sudo systemctl start postgresql
# Mac: brew services start postgresql

# OU utiliser SQLite pour tests
# Modifier DATABASE_URL dans .env:
DATABASE_URL="file:./prisma/dev.db"
```

---

### Problème : ENCRYPTION_KEY invalide

**Erreur :**
```
ENCRYPTION_KEY must be 32 bytes
```

**Solution :**
```bash
# Générer une nouvelle clé valide
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copier la sortie dans .env comme ENCRYPTION_KEY
```

---

### Problème : Build Next.js échoue

**Solution :**
```bash
# Nettoyer les caches
rm -rf .next node_modules package-lock.json

# Réinstaller
npm install

# Rebuild
npm run build
```

---

## 📊 Fonctionnalités Disponibles

### ✅ Interface Backoffice
- **Dashboard** : Métriques en temps réel, kill switch
- **Inbox** : Messages entrants IMAP avec threading
- **Send** : Compositeur riche avec routing intelligent
- **History** : Historique détaillé des envois
- **Settings** : Configuration SMTP, identités, DNS, DMARC

### ✅ Routage Intelligent SMTP
- Lookup MX automatique
- Scoring basé sur taux de succès
- Retry automatique avec backoff
- Rate limiting par org et provider
- Pool de connexions réutilisées

### ✅ Conformité Email
- SPF/DKIM/DMARC validation
- Rotation automatique DKIM
- DMARC adaptatif (none → quarantine → reject)
- List-Unsubscribe One-Click (RFC 8058)
- Suppression list

### ✅ Tracking
- Pixel de tracking ouvertures
- Événements de tracking
- Analytics par recipient

### ✅ Sécurité
- Authentification Argon2id
- Cookies HttpOnly + CSRF
- Chiffrement secrets (libsodium)
- RBAC (Owner/Admin/Member)
- Audit logs

---

## 📝 Commandes Utiles

```bash
# Prisma Studio (UI base de données)
npm run db:studio

# Type check TypeScript
npm run type-check

# Lint
npm run lint

# Tests unitaires
npm test

# Tests E2E
npm run test:e2e

# Générer migration Prisma
npx prisma migrate dev --name nom_migration

# Reset base de données
npx prisma migrate reset
```

---

## 🎯 Prochaines Étapes

1. ✅ Configurer au moins 1 compte SMTP dans `/settings`
2. ✅ Créer une identité d'envoi
3. ✅ Configurer DNS (SPF, DKIM, DMARC) pour votre domaine
4. ✅ Tester l'envoi avec `/send`
5. ✅ Surveiller `/dashboard` pour métriques
6. ✅ Configurer IMAP pour inbox si besoin

---

## 📚 Documentation Complète

- **README.md** : Vue d'ensemble du projet
- **RAPPORT_CORRECTIONS_FINALES.md** : Détails de toutes les corrections
- **.env.example** : Variables d'environnement disponibles
- **prisma/schema.prisma** : Modèle de données complet

---

## 🆘 Besoin d'Aide ?

1. Vérifier les logs applicatifs
2. Consulter `/api/health` pour status
3. Vérifier Redis : `redis-cli ping`
4. Vérifier PostgreSQL : `psql -l`
5. Consulter le rapport de corrections pour problèmes connus

---

**🎉 Bon développement !**
