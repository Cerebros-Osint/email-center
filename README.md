# Email Software Complet

Application full-stack de gestion d'emails avec routage intelligent SMTP, DMARC adaptatif et délivrabilité optimisée.

> **Version:** 1.0.0 | **Status:** ✅ Production Ready | **Build:** ✅ Passing

---

## 🚀 Démarrage Rapide

### Installation Locale

```bash
# 1. Cloner et installer
git clone https://github.com/VOTRE-USERNAME/email-software-complet.git
cd email-software-complet
npm install

# 2. Configurer .env
cp .env.example .env
# Éditer .env avec vos valeurs

# 3. Générer les secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # SESSION_SECRET

# 4. Initialiser la base de données
npx prisma generate
npx prisma db push
npm run db:seed

# 5. Lancer l'application
npm run dev          # Terminal 1 - Web
npm run worker:all   # Terminal 2 - Workers
```

**Accès:** http://localhost:3000  
**Login:** admin@acme.com / Pass456@

### Déploiement Production (Render.com)

```bash
# 1. Pousser sur GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE-USERNAME/email-software-complet.git
git push -u origin main

# 2. Sur Render.com
- New + → Blueprint
- Sélectionner votre repo
- Apply (utilise render.yaml)
- Configurer les variables d'environnement
```

📚 **Guide complet:** [DEPLOIEMENT_RENDER.md](DEPLOIEMENT_RENDER.md)

---

### Backoffice Complet
- **Authentification** : Argon2id, cookies HttpOnly, CSRF protection
- **Dashboard** : Métriques en temps réel, kill switch, quotas
- **Inbox/Reply** : Poll IMAP, parsing MIME, HTML sanitisé, threading
- **Send** : Éditeur riche, préflight checks, explication du routage SMTP
- **History** : Historique des tentatives avec détails techniques
- **Settings** : SMTP, identités, DNS, DMARC, DKIM, rate limits

### Envoi Intelligent
- **Lookup MX** : Résolution DNS avec cache 48h, détection provider (Gmail/Outlook/Yahoo)
- **Scoring SMTP** : Ranking basé sur taux de succès, capacités, latence, rate limits
- **Routing** : Sélection automatique du meilleur SMTP par domaine destinataire
- **Concurrence** : Semaphore par domaine MX (max 2 connexions simultanées)
- **Backoff + Jitter** : Retry intelligent avec délai exponentiel
- **Rate Limits** : Par org et par provider
- **Pooling** : Connexions SMTP réutilisées (Nodemailer)

### Conformité & Délivrabilité
- **List-Unsubscribe** : One-Click (RFC 8058)
- **Suppression List** : Gestion des désabonnements
- **DNS Wizard** : Validation SPF, DKIM, MX, DMARC
- **Rotation DKIM** : Automatique avec période de transition 7j
- **DMARC Adaptatif** : 
  - Progression automatique : `none` → `quarantine 50%` → `quarantine 100%` → `reject`
  - KPIs requis : ≥98% alignement, ≥1000 messages/semaine
  - Rollback automatique si taux d'échec >5%
  - Publication via Route53/Cloudflare ou manuel
  - Max 1 changement/jour par domaine

### Sécurité & Observabilité
- **Chiffrement** : libsodium (sealed box) pour secrets SMTP
- **RBAC** : Owner/Admin/Member
- **Audit Log** : Actions sensibles tracées (IP, UA, résultat)
- **Métriques Prometheus** : `/api/metrics`
- **Logs structurés** : Pino JSON

## 📋 Prérequis

- Node.js ≥18
- PostgreSQL ≥13
- Redis ≥6
- Comptes SMTP (SES, Titan, ou custom)
- (Optionnel) AWS Route53 ou Cloudflare pour auto-publication DNS

## 🛠️ Installation

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Configuration

Copier `.env.example` vers `.env` et remplir :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/emailapp"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth & Security  
SESSION_SECRET="votre-secret-min-32-chars"
ENCRYPTION_KEY="votre-cle-libsodium-32-bytes-hex"

# IMAP (inbox)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="votre-email@domain.com"
IMAP_PASS="votre-password"
REPLY_DOMAIN="votredomaine.com"

# AWS SES (optionnel)
SES_REGION="us-east-1"
SES_ACCESS_KEY_ID=""
SES_SECRET_ACCESS_KEY=""

# Titan Email (optionnel)
TITAN_HOST="smtp.titan.email"
TITAN_PORT="587"
TITAN_USER=""
TITAN_PASS=""

# Route53 pour DNS auto-publish (optionnel)
ROUTE53_ACCESS_KEY_ID=""
ROUTE53_SECRET_ACCESS_KEY=""
ROUTE53_REGION="us-east-1"

# Cloudflare pour DNS auto-publish (optionnel)
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_ZONE_ID=""
```

### 3. Base de données

```bash
# Générer Prisma client
npx prisma generate

# Pousser le schéma
npx prisma db push

# (Optionnel) Seed data
npm run db:seed
```

### 4. Lancer l'application

```bash
# Développement
npm run dev

# Production
npm run build
npm start

# Workers (dans un terminal séparé)
npm run worker:all
```

L'application sera disponible sur `http://localhost:3000`

## 🏗️ Architecture

```
/app
  /(auth)/login          # Authentification
  /(dashboard)/dashboard # Dashboard métriques
  /(mail)/inbox          # Inbox IMAP
  /(mail)/send           # Compositeur email
  /(mail)/history        # Historique envois
  /(settings)/settings   # Configuration
  /api                   # API REST
    /auth                # Login/logout
    /org                 # Settings org, kill switch
    /smtp-accounts       # CRUD SMTP
    /identities          # CRUD identités
    /messages            # Créer/envoyer messages
    /history             # Historique tentatives
    /inbox               # Messages entrants
    /dns                 # Vérification DNS
    /dkim                # Rotation DKIM
    /dmarc               # Publication DMARC
    /suppression         # Liste suppression
    /unsubscribe         # One-Click unsubscribe
    /metrics             # Prometheus metrics
    /health              # Health check

/lib
  auth.ts              # Session, CSRF
  db.ts                # Prisma client
  redis.ts             # Redis + BullMQ
  crypto.ts            # Argon2, libsodium
  validator.ts         # Schemas Zod
  dns.ts               # MX lookup, SPF/DKIM/DMARC check
  smtp.ts              # Nodemailer pooling
  routing.ts           # Scoring SMTP, rate limits
  preflight.ts         # Validation pré-envoi
  sanitize.ts          # HTML sanitization
  imap.ts              # IMAP polling
  dmarc.ts             # DMARC state machine
  dkim.ts              # DKIM rotation
  metrics.ts           # Prometheus collectors
  events.ts            # Event bus interne

/workers
  preflight.worker.ts  # Validation messages
  send.worker.ts       # Envoi SMTP avec retry
  imapPoll.worker.ts   # Poll IMAP toutes les 2min
  dnsCheck.worker.ts   # Vérification DNS
  dmarcMonitor.worker.ts # Ingestion rapports DMARC
  dmarcAdjust.worker.ts  # Ajustement politique DMARC
  dkimRotate.worker.ts   # Exécution rotation DKIM

/components
  ui/                  # Composants réutilisables
  charts/              # Graphiques délivrabilité
  cards/               # Cards métriques
  panels/              # Panneaux préflight, SMTP why
  drawers/             # Drawers détails
  settings/            # Formulaires settings
  banners/             # Bannières alertes

/prisma
  schema.prisma        # Modèle de données
  seed.ts              # Données de test
```

## 📊 Workflow d'envoi

```
1. Composer → Preflight
   - Validation format email
   - Check suppression list
   - MX lookup + hint provider
   - Score SMTP accounts
   - Estimation taille

2. Preflight → Queue
   - Job BullMQ "preflight"
   - Validation finale
   - Rate limit check

3. Queue → Send Worker
   - Acquire MX semaphore
   - Get best SMTP from score
   - Send via Nodemailer pool
   - Record attempt + metrics
   - Retry with backoff si 4xx

4. Success/Fail
   - Update recipient status
   - Release MX semaphore
   - Emit event
   - Log audit
```

## 🔐 Sécurité

- **Authentification** : Argon2id (64MB mem, 3 iterations)
- **Session** : Redis, 7 jours expiration
- **CSRF** : Double-submit cookie
- **Secrets SMTP** : Chiffré libsodium (secretbox)
- **Rate Limiting** : Login, mutations sensibles
- **RBAC** : Owner (all), Admin (SMTP/settings), Member (envoi uniquement)
- **Audit Log** : IP, UA, action, résultat

## 📈 Métriques Prometheus

Exposées sur `/api/metrics` :

- `emails_sent_total{org_id, provider, mx_hint, result}`
- `emails_received_total{org_id}`
- `smtp_latency_seconds{smtp_account_id, provider}`
- `active_smtp_accounts{org_id, provider}`
- `queue_depth{queue_name}`
- `suppressions_total{org_id, reason}`
- `unsubscribes_total{org_id, method}`
- `dmarc_policy_changes_total{org_id, domain, from_policy, to_policy}`

## 🧪 Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 📚 Documentation

- **[GUIDE_DEMARRAGE.md](GUIDE_DEMARRAGE.md)** - Guide pas-à-pas pour installation locale
- **[DEPLOIEMENT_RENDER.md](DEPLOIEMENT_RENDER.md)** - Déploiement production sur Render.com
- **[RAPPORT_CORRECTIONS_FINALES.md](RAPPORT_CORRECTIONS_FINALES.md)** - Détails des corrections et optimisations
- **[GUIDE_INSTALLATION.md](GUIDE_INSTALLATION.md)** - Installation approfondie
- **.env.example** - Template des variables d'environnement

---

## 🎯 Fonctionnalités Principales

### Backoffice Complet
- **Authentification** : Argon2id, cookies HttpOnly, CSRF protection
- **Dashboard** : Métriques en temps réel, kill switch, quotas
- **Inbox/Reply** : Poll IMAP, parsing MIME, HTML sanitisé, threading
- **Send** : Éditeur riche, préflight checks, explication du routage SMTP
- **History** : Historique des tentatives avec détails techniques
- **Settings** : SMTP, identités, DNS, DMARC, DKIM, rate limits

### Envoi Intelligent
- **Lookup MX** : Résolution DNS avec cache 48h, détection provider (Gmail/Outlook/Yahoo)
- **Scoring SMTP** : Ranking basé sur taux de succès, capacités, latence, rate limits
- **Routing** : Sélection automatique du meilleur SMTP par domaine destinataire
- **Concurrence** : Semaphore par domaine MX (max 2 connexions simultanées)
- **Backoff + Jitter** : Retry intelligent avec délai exponentiel
- **Rate Limits** : Par org et par provider
- **Pooling** : Connexions SMTP réutilisées (Nodemailer)

### Conformité & Délivrabilité
- **List-Unsubscribe** : One-Click (RFC 8058)
- **Suppression List** : Gestion des désabonnements
- **DNS Wizard** : Validation SPF, DKIM, MX, DMARC
- **Rotation DKIM** : Automatique avec période de transition 7j
- **DMARC Adaptatif** : 
  - Progression automatique : `none` → `quarantine 50%` → `quarantine 100%` → `reject`
  - KPIs requis : ≥98% alignement, ≥1000 messages/semaine
  - Rollback automatique si taux d'échec >5%
  - Publication via Route53/Cloudflare ou manuel
  - Max 1 changement/jour par domaine

### Sécurité & Observabilité
- **Chiffrement** : libsodium (sealed box) pour secrets SMTP
- **RBAC** : Owner/Admin/Member
- **Audit Log** : Actions sensibles tracées (IP, UA, résultat)
- **Métriques Prometheus** : `/api/metrics`
- **Logs structurés** : Pino JSON
- **Security Headers** : HSTS, CSP, X-Frame-Options, etc.

---

## 🛠️ Stack Technique

### Frontend
- **Next.js 14** - App Router, Server Components, Server Actions
- **React 18** - UI Components
- **TailwindCSS** - Styling
- **React Hook Form** - Gestion formulaires
- **Recharts** - Graphiques
- **Lucide React** - Icons

### Backend
- **Next.js API Routes** - REST API
- **Prisma** - ORM (PostgreSQL/SQLite)
- **BullMQ** - Job queue & workers
- **Redis** - Cache & sessions
- **Nodemailer** - SMTP client
- **ImapFlow** - IMAP client

### Security
- **Argon2** - Password hashing
- **libsodium** - Encryption (secrets SMTP)
- **Zod** - Validation
- **sanitize-html** - XSS protection

### Monitoring
- **Pino** - Structured logging
- **Prom-client** - Prometheus metrics

---

## 📋 Prérequis

### Développement Local
- Node.js ≥ 18
- PostgreSQL ≥ 13 (ou SQLite pour tests)
- Redis ≥ 6

### Production
- Serveur Node.js (Render, Vercel, AWS, etc.)
- PostgreSQL managé (Render, Supabase, AWS RDS)
- Redis managé (Render, Upstash, AWS ElastiCache)
- Comptes SMTP (AWS SES, Titan Email, etc.)
- (Optionnel) AWS Route53 ou Cloudflare pour DNS auto-publish

---

## 🚀 Déploiement

```bash
# Prisma Studio (UI base de données)
npm run db:studio

# Type check
npm run type-check

# Lint
npm run lint

# Format
npx prettier --write .
```

## 🚨 Troubleshooting

### Les envois ne partent pas
- Vérifier le kill switch (`/settings`)
- Vérifier les rate limits
- Consulter les logs `docker logs email-app`
- Vérifier les queues BullMQ

### DMARC ne se publie pas
- Vérifier les credentials Route53/Cloudflare
- Vérifier `dnsProvider` et `dnsZoneRef` dans `DomainConfig`
- Vérifier que RUA est configuré
- Consulter `/api/dmarc/status`

### IMAP ne reçoit pas
- Vérifier credentials IMAP dans `.env`
- Tester connexion manuellement
- Consulter logs worker `imapPoll`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

## 🙏 Crédits

- Next.js - Framework React
- Prisma - ORM
- BullMQ - Job queue
- Nodemailer - SMTP client
- ImapFlow - IMAP client
- libsodium - Cryptographie
- Prom-client - Métriques

---

**Note** : Cette application est conçue pour un usage professionnel avec de forts volumes d'emails. Respectez les bonnes pratiques d'envoi (SPF, DKIM, DMARC) et les lois anti-spam (CAN-SPAM, RGPD).
