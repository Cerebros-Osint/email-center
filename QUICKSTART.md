# 🚀 Quick Start Guide

## Installation rapide

### 1. Installer les dépendances

```bash
cd c:\Users\Administrator\Desktop\Email-Software-complet
npm install
```

### 2. Configurer PostgreSQL et Redis

**PostgreSQL** (via Docker - recommandé) :
```bash
docker run --name email-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=emailapp -p 5432:5432 -d postgres:15
```

**Redis** (via Docker - recommandé) :
```bash
docker run --name email-redis -p 6379:6379 -d redis:7
```

Ou installez-les localement selon votre système d'exploitation.

### 3. Configurer les variables d'environnement

Créez `.env` à partir de `.env.example` :

```bash
copy .env.example .env
```

**Configuration minimale pour démarrer** :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/emailapp"
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="votre-secret-minimum-32-caracteres-ici"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

> ⚠️ **Important** : Générez une vraie clé ENCRYPTION_KEY avec :
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4. Initialiser la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables
npx prisma db push

# Seed avec données de test
npm run db:seed
```

### 5. Lancer l'application

**Terminal 1 - Serveur Next.js** :
```bash
npm run dev
```

**Terminal 2 - Workers BullMQ** :
```bash
npm run worker:all
```

### 6. Accéder à l'application

Ouvrez votre navigateur : **http://localhost:3000**

**Credentials de test** :
- Email: `admin@acme.com`
- Password: `password123`

---

## ✅ Première configuration

### Configurer vos comptes SMTP

1. Aller dans **Settings** → **SMTP Accounts**
2. Cliquer sur **Add SMTP Account**
3. Remplir les informations :
   - Provider : AWS SES / Titan / Custom
   - Host : smtp.example.com
   - Port : 587 (ou 465 pour SSL)
   - Username & Password
   - From Email : votre@email.com
   - Rate Limit : 100 (par minute)

4. Cliquer sur **Test Connection** pour vérifier
   - Vérifie STARTTLS, SIZE, PIPELINING, 8BITMIME
   - Mesure la latence

### Créer une identité d'envoi

1. **Settings** → **Identities**
2. **Add Identity**
   - Display Name : "Support Acme"
   - From Email : support@acme.com
   - Default SMTP : Sélectionner un compte SMTP

### Configurer le DNS (important !)

1. **Settings** → **DNS Wizard**
2. Entrer votre domaine : `acme.com`
3. Suivre les instructions pour :
   - ✅ SPF : `v=spf1 include:amazonses.com ~all`
   - ✅ DKIM : Ajouter les clés publiques
   - ✅ MX : Vérifier les enregistrements
   - ✅ DMARC : Commencer avec `p=none`

### Configuration DMARC adaptive

1. **Settings** → **DMARC Manager**
2. Configurer :
   - RUA (aggregate reports) : dmarc@votre-domaine.com
   - DNS Provider : Route53 ou Cloudflare (optionnel)
   - Zone ID / Hosted Zone ID
3. Activer l'ajustement automatique

---

## 📧 Envoyer votre premier email

1. Aller dans **Send**
2. Sélectionner une identité
3. Composer :
   - Destinataires : test@gmail.com
   - Sujet : "Test Email"
   - Corps : Votre message
4. Cliquer sur **Preflight Check**
   - Vérifie le format email
   - Lookup MX (détecte Gmail/Outlook/Yahoo)
   - Score les comptes SMTP
   - Affiche "Pourquoi ce SMTP ?"
5. Si OK, cliquer sur **Send**

### Vérifier l'envoi

1. **History** → Voir le message
2. Cliquer sur la ligne pour ouvrir le drawer
3. Voir :
   - MX détecté (ex: gmail)
   - SMTP utilisé
   - Score et facteurs
   - Latence
   - Capacités (STARTTLS, etc.)
   - Code de réponse SMTP

---

## 🔧 Configuration avancée

### IMAP (recevoir des emails)

Dans `.env`, ajouter :

```env
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="votre-email@gmail.com"
IMAP_PASS="votre-mot-de-passe-app"
REPLY_DOMAIN="votredomaine.com"
```

> 💡 **Gmail** : Utilisez un "App Password" (pas votre mot de passe principal)

Les workers pollent IMAP toutes les 2 minutes automatiquement.

### AWS SES

```env
SES_REGION="us-east-1"
SES_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
SES_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

### Route53 (auto-publish DMARC)

```env
ROUTE53_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
ROUTE53_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
ROUTE53_REGION="us-east-1"
```

Dans Settings → Domain Config :
- DNS Provider : `route53`
- Zone Ref : `Z1234567890ABC` (votre Hosted Zone ID)

### Cloudflare (auto-publish DMARC)

```env
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
CLOUDFLARE_ZONE_ID="your-zone-id"
```

Dans Settings → Domain Config :
- DNS Provider : `cloudflare`
- Zone Ref : Votre Zone ID

---

## 📊 Monitoring

### Prometheus Metrics

Accéder aux métriques : **http://localhost:3000/api/metrics**

Métriques disponibles :
- `emails_sent_total` (par org, provider, mx_hint, result)
- `smtp_latency_seconds`
- `active_smtp_accounts`
- `queue_depth`
- `emails_received_total`
- `suppressions_total`
- `unsubscribes_total`
- `dmarc_policy_changes_total`

### Health Check

**http://localhost:3000/api/health**

Vérifie :
- ✅ Database (PostgreSQL)
- ✅ Redis

### Logs

Les workers affichent des logs structurés (Pino JSON) :

```bash
# Voir les logs des workers
# Dans le terminal où vous avez lancé npm run worker:all
```

En production, redirigez vers un système de logging centralisé (Datadog, CloudWatch, etc.)

### Prisma Studio (UI base de données)

```bash
npm run db:studio
```

Ouvre une interface web pour explorer/éditer la base : **http://localhost:5555**

---

## 🎯 Cas d'usage courants

### Kill Switch (urgence)

Si vous devez stopper tous les envois immédiatement :

1. **Dashboard** → Toggle **Kill Switch** ON
2. Tous les envois en queue sont mis en pause
3. Toggle OFF pour reprendre

### Rotation DKIM

1. **Settings** → **DKIM Rotation**
2. Cliquer sur **Plan Rotation**
3. Copier le nouveau record DNS :
   ```
   dkim1234567._domainkey.acme.com TXT "v=DKIM1; k=ed25519; p=..."
   ```
4. Ajouter à votre DNS
5. Attendre 7 jours (propagation)
6. Cliquer sur **Execute Rotation**

Le système bascule automatiquement vers le nouveau selector.

### Progression DMARC

Le système ajuste automatiquement DMARC si :
- ✅ Taux d'alignement ≥ 98%
- ✅ Volume ≥ 1000 messages/semaine
- ✅ Taux d'échec < 5%

Progression :
1. `p=none` (monitoring uniquement)
2. `p=quarantine pct=50` (50% des emails non-alignés en spam)
3. `p=quarantine pct=100` (tous en spam)
4. `p=reject` (rejet total)

Vérifier l'état : **Settings** → **DMARC Manager**

### Suppression List

Ajouter un email à la suppression list :

```bash
curl -X POST http://localhost:3000/api/suppression \
  -H "Content-Type: application/json" \
  -d '{"email": "bounce@example.com", "reason": "Hard bounce"}'
```

Ou via l'UI : **Settings** → **Suppression List**

### One-Click Unsubscribe

Les emails incluent automatiquement :
- `List-Unsubscribe: <https://app.example.com/unsubscribe?token=...>`
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click`

Lorsqu'un utilisateur clique, il est ajouté à la suppression list automatiquement.

---

## 🐛 Troubleshooting

### "Cannot connect to database"

```bash
# Vérifier que PostgreSQL est lancé
docker ps | grep email-postgres

# Vérifier la connexion
psql postgresql://postgres:postgres@localhost:5432/emailapp
```

### "Cannot connect to Redis"

```bash
# Vérifier que Redis est lancé
docker ps | grep email-redis

# Test connexion
redis-cli ping
# Devrait répondre : PONG
```

### "No SMTP accounts available"

1. Vérifier dans Settings → SMTP Accounts
2. Créer au moins un compte SMTP
3. Tester la connexion

### "MX lookup failed"

- Vérifier votre connexion internet
- Le domaine destinataire doit avoir des enregistrements MX valides
- Consulter les logs pour plus de détails

### TypeScript errors dans l'IDE

Normal avant `npm install`. Les erreurs disparaîtront après installation des dépendances.

---

## 📚 Ressources

- **Documentation complète** : Voir `README.md`
- **Architecture** : Voir section "Architecture" dans README
- **API Reference** : Voir `README.md` section "API"
- **Prisma Schema** : `prisma/schema.prisma`

## 🆘 Support

- Créer une issue sur GitHub
- Consulter les logs (`docker logs` pour services, terminaux pour app)
- Utiliser Prisma Studio pour debug DB

---

**Bon développement ! 🚀**
