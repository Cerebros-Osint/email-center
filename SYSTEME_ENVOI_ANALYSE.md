# 🔍 ANALYSE COMPLÈTE DU SYSTÈME D'ENVOI EMAIL

Date: 2025-11-02 22:21 UTC
Analyse: Routing intelligent SMTP + Display name + MX

---

## 📊 VUE D'ENSEMBLE DU SYSTÈME

### Architecture du système d'envoi

```
┌─────────────────────────────────────────────────────────────┐
│  1. CRÉATION DU MESSAGE                                     │
│     - Utilisateur choisit: identité, destinataires, contenu│
│     - Peut override: customDisplayName, customFromEmail    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. PREFLIGHT CHECK                                         │
│     - Validation des emails                                 │
│     - Lookup MX pour chaque destinataire                   │
│     - Scoring préliminaire des SMTP                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. MISE EN QUEUE (BullMQ)                                 │
│     - Job par recipient créé                               │
│     - Data: recipientId, messageId, orgId                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. WORKER SEND (Traitement intelligent)                   │
│     ┌───────────────────────────────────────────────────┐ │
│     │ A. RÉCUPÉRATION DES DONNÉES                       │ │
│     │    - Message + Identity + Recipients              │ │
│     │    - customDisplayName si présent                 │ │
│     │    - customFromEmail si présent                   │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ B. VÉRIFICATIONS                                  │ │
│     │    - Kill switch de l'organisation               │ │
│     │    - Existence du recipient                       │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ C. LOOKUP MX (DNS)                                │ │
│     │    - Extraction du domaine (user@domain.com)     │ │
│     │    - Résolution DNS des MX records                │ │
│     │    - Détection du provider (Gmail, Outlook, etc) │ │
│     │    - Cache 48h                                     │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ D. SCORING INTELLIGENT DES SMTP                   │ │
│     │    - Facteurs analysés:                           │ │
│     │      1. Compatibilité MX/Provider (weight: 30%)  │ │
│     │      2. Success rate 72h (weight: 25%)           │ │
│     │      3. Latence moyenne (weight: 20%)            │ │
│     │      4. Rate limits disponibles (weight: 15%)    │ │
│     │      5. Warm-up score (weight: 10%)              │ │
│     │    - Tri par score décroissant                    │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ E. SÉLECTION DU SMTP                              │ │
│     │    - Meilleur score = 1er dans la liste          │ │
│     │    - FROM email = SMTP account fromEmail         │ │
│     │      (PAS customFromEmail, PAS identity email)   │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ F. GÉNÉRATION DU TRACKING                         │ │
│     │    - Génération trackingId unique                 │ │
│     │    - Injection pixel invisible si enabled         │ │
│     │    - Transformation des liens                     │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ G. CONSTRUCTION DU FROM HEADER                    │ │
│     │    - Display name:                                │ │
│     │      customDisplayName OU identity.displayName   │ │
│     │    - Email:                                        │ │
│     │      TOUJOURS smtpAccount.fromEmail              │ │
│     │    - Format final:                                │ │
│     │      "Display Name" <smtp-from-email>            │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ H. ENVOI SMTP                                      │ │
│     │    - Acquisition du semaphore MX                  │ │
│     │    - Tentative d'envoi via SMTP sélectionné      │ │
│     │    - Si échec 4xx: essai prochain SMTP            │ │
│     │    - Si échec 5xx: arrêt immédiat                │ │
│     │    - Si succès: enregistrement stats              │ │
│     └───────────────────────────────────────────────────┘ │
│                          ↓                                  │
│     ┌───────────────────────────────────────────────────┐ │
│     │ I. ENREGISTREMENT                                 │ │
│     │    - SendAttempt créé (success/fail)             │ │
│     │    - Métriques Prometheus                         │ │
│     │    - Logs structurés                              │ │
│     │    - Update recipient status                      │ │
│     └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 SYSTÈME DE SCORING INTELLIGENT

### Algorithme de scoring (lib/routing.ts)

```typescript
function scoreSmtpAccounts(ctx: RoutingContext): SmtpScore[] {
  const scores = [];
  
  for (const account of smtpAccounts) {
    let score = 0;
    
    // 1. COMPATIBILITÉ MX/PROVIDER (30%)
    // Si le destinataire est Gmail et le SMTP est optimisé pour Gmail
    if (isMxCompatible(account.provider, ctx.mxHint)) {
      score += 30;
    }
    
    // 2. SUCCESS RATE 72h (25%)
    // Taux de succès des derniers envois
    const successRate = getSuccessRate(account.id, 72);
    score += successRate * 0.25;
    
    // 3. LATENCE MOYENNE (20%)
    // Plus c'est rapide, mieux c'est
    const latencyScore = calculateLatencyScore(account.latencyMs);
    score += latencyScore * 0.20;
    
    // 4. RATE LIMITS DISPONIBLES (15%)
    // Combien d'envois restants avant d'atteindre la limite
    const rateLimitScore = calculateRateLimitScore(account);
    score += rateLimitScore * 0.15;
    
    // 5. WARM-UP SCORE (10%)
    // Les SMTP récemment utilisés sont préférés (warm)
    const warmupScore = calculateWarmupScore(account);
    score += warmupScore * 0.10;
    
    scores.push({
      smtpAccountId: account.id,
      score: score,
      provider: account.provider,
    });
  }
  
  // Tri par score décroissant
  return scores.sort((a, b) => b.score - a.score);
}
```

---

## 📧 CONSTRUCTION DU FROM HEADER

### Code actuel (workers/send.worker.enhanced.ts)

```typescript
// Ligne ~118-126
const message = recipient.message;
const identity = message.identity;

// 1. DISPLAY NAME: Priorité au custom
const displayName = message.customDisplayName || identity.displayName;

// 2. FROM EMAIL: TOUJOURS le SMTP sélectionné par routing
const smtpAccount = await prisma.smtpAccount.findUnique({
  where: { id: smtpScore.smtpAccountId },
});
const fromEmail = smtpAccount.fromEmail;

// 3. CONSTRUCTION DU HEADER
const fromHeader = `${displayName} <${fromEmail}>`;

// Exemple de résultat:
// "Support Premium" <ses-account@acme.com>
//  ↑ Custom display      ↑ SMTP sélectionné par scoring
```

---

## 🔄 FLOW DÉTAILLÉ ÉTAPE PAR ÉTAPE

### Exemple concret d'envoi

**Contexte:**
- Utilisateur: admin@acme.com
- Destinataire: client@gmail.com
- customDisplayName: "Support VIP"
- Message: "Bonjour..."

**SMTP disponibles:**
```
1. AWS SES       (ses-account@acme.com)      - Rate limit: 14/min
2. Titan Email   (titan-account@acme.com)    - Rate limit: 100/min
3. SendGrid      (sendgrid-account@acme.com) - Rate limit: 50/min
```

### Étape 1: Preflight Check

```typescript
// 1.1 Extraction du domaine
const domain = "gmail.com"  // de client@gmail.com

// 1.2 Lookup MX
const mxRecords = await dns.resolveMx(domain);
// Résultat: ["aspmx.l.google.com", "alt1.aspmx.l.google.com", ...]

// 1.3 Détection provider
const mxHint = "google"  // Détecté depuis aspmx.l.google.com
```

### Étape 2: Scoring des SMTP

```typescript
// Pour chaque SMTP, calcul du score:

// AWS SES:
score = 0
+ 30  // Compatibilité Gmail (AWS SES est bon pour Gmail)
+ 22  // Success rate: 88% sur 72h
+ 18  // Latence: 150ms (bonne)
+ 12  // Rate limit: 10/14 utilisés (OK)
+ 8   // Warm-up: Utilisé il y a 2min (chaud)
= 90 points

// Titan Email:
score = 0
+ 25  // Compatibilité Gmail (moins optimisé)
+ 20  // Success rate: 80%
+ 20  // Latence: 200ms (acceptable)
+ 15  // Rate limit: 50/100 utilisés (excellent)
+ 7   // Warm-up: Utilisé il y a 10min
= 87 points

// SendGrid:
score = 0
+ 28  // Compatibilité Gmail (très bon)
+ 18  // Success rate: 72%
+ 16  // Latence: 250ms (moyen)
+ 10  // Rate limit: 45/50 utilisés (serré)
+ 6   // Warm-up: Utilisé il y a 30min
= 78 points
```

**Résultat du tri:**
```
1. AWS SES       (90 points) ← SÉLECTIONNÉ
2. Titan Email   (87 points)
3. SendGrid      (78 points)
```

### Étape 3: Construction du FROM

```typescript
// Display name
const displayName = "Support VIP"  // customDisplayName fourni

// FROM email
const fromEmail = "ses-account@acme.com"  // Du SMTP AWS SES sélectionné

// FROM header final
const from = "Support VIP <ses-account@acme.com>"
```

### Étape 4: Envoi SMTP

```typescript
await sendEmail({
  smtpAccountId: "aws-ses-id",
  from: "Support VIP <ses-account@acme.com>",
  to: "client@gmail.com",
  subject: "Bonjour...",
  html: htmlWithTracking,
  text: "Version texte...",
  headers: {
    'X-Mailer': 'Email-Software-Complet',
    'X-Message-ID': 'msg-uuid',
    'List-Unsubscribe': '<https://app.acme.com/unsubscribe?token=xyz>',
  },
});
```

---

## ⚙️ PARAMÈTRES INFLUENÇANT LE CHOIX

### 1. MX du destinataire (30% du score)

**Exemples de compatibilité:**

| MX Destinataire | SMTP Optimisé | Score bonus |
|-----------------|---------------|-------------|
| Google (Gmail) | AWS SES | +30 |
| Google (Gmail) | SendGrid | +28 |
| Microsoft (Outlook) | Titan Email | +30 |
| Microsoft (Outlook) | AWS SES | +25 |
| Yahoo | SendGrid | +27 |
| Domaine custom | Tous égaux | +20 |

### 2. Success rate (25% du score)

```typescript
Success rate 100% = +25 points
Success rate 90%  = +22.5 points
Success rate 80%  = +20 points
Success rate 70%  = +17.5 points
Success rate <60% = +15 points
```

### 3. Latence moyenne (20% du score)

```typescript
Latence <100ms  = +20 points
Latence <150ms  = +18 points
Latence <200ms  = +16 points
Latence <300ms  = +14 points
Latence >300ms  = +10 points
```

### 4. Rate limits (15% du score)

```typescript
Utilisation <50%  = +15 points
Utilisation <70%  = +12 points
Utilisation <90%  = +8 points
Utilisation >90%  = +5 points
```

### 5. Warm-up (10% du score)

```typescript
Utilisé <5min    = +10 points
Utilisé <15min   = +8 points
Utilisé <30min   = +6 points
Utilisé <60min   = +4 points
Utilisé >60min   = +2 points
```

---

## 🎛️ CUSTOMISATION POSSIBLE

### Display Name

```typescript
// Option 1: Utiliser l'identité par défaut
POST /api/messages
{
  "identityId": "uuid-identity",
  // displayName sera: identity.displayName
}

// Option 2: Override avec customDisplayName
POST /api/messages
{
  "identityId": "uuid-identity",
  "customDisplayName": "Support Premium",
  // displayName sera: "Support Premium"
}
```

### FROM Email

**IMPORTANT**: Le FROM email est **TOUJOURS** celui du SMTP sélectionné par le scoring.

**Pourquoi?**
1. **SPF/DKIM**: Le SMTP doit être autorisé à envoyer pour ce domaine
2. **Réputation**: Chaque SMTP a sa propre réputation
3. **Authentification**: Les credentials SMTP sont liés à l'email

**Exemple:**
```
Même si customFromEmail = "custom@acme.com"
Si AWS SES est sélectionné avec fromEmail = "ses@acme.com"
Alors FROM = "Display Name <ses@acme.com>"
```

---

## 🔒 SÉCURITÉ ET AUTHENTIFICATION

### SPF Record

```
v=spf1 include:amazonses.com include:titan.email ~all
```
→ Autorise AWS SES et Titan Email à envoyer pour @acme.com

### DKIM Signature

Chaque SMTP signe l'email avec sa clé DKIM:
```
DKIM-Signature: v=1; a=rsa-sha256; d=acme.com; s=ses20240101;
  h=from:to:subject;
  bh=...;
  b=...
```

### DMARC Policy

```
v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@acme.com
```
→ Valide l'alignement SPF + DKIM

---

## 📊 MÉTRIQUES ET MONITORING

### Données enregistrées par envoi

```typescript
SendAttempt {
  recipientId: "uuid",
  smtpAccountId: "aws-ses-uuid",  // ← SMTP utilisé
  result: "ok",
  latencyMs: 156,
  providerMsgId: "010101...",
  responseRaw: "250 OK",
  createdAt: "2024-11-02T22:00:00Z"
}
```

### Métriques Prometheus

```
emails_sent_total{
  org_id="org-1",
  provider="AWS SES",
  mx_hint="google",
  result="success"
} = 1234

smtp_latency_seconds{
  smtp_account_id="aws-ses-uuid",
  provider="AWS SES"
} = 0.156
```

---

## 🔄 GESTION DES ÉCHECS

### Retry avec fallback

```typescript
// 1. Essai avec AWS SES (score 90)
try {
  await sendViaSmtp(awsSesId);
} catch (error) {
  if (is4xxError(error)) {
    // Erreur temporaire → Essayer le suivant
    
    // 2. Essai avec Titan Email (score 87)
    try {
      await sendViaSmtp(titanId);
    } catch (error2) {
      // ...
    }
  } else {
    // Erreur permanente → Arrêter
    markAsFailed();
  }
}
```

### Backoff exponentiel

```typescript
const delay = calculateBackoff(attempt, baseDelay);
// Attempt 1: 1000ms
// Attempt 2: 1700ms
// Attempt 3: 2890ms
// + jitter 20%
```

---

## ✅ RÉSUMÉ DU SYSTÈME

### Ce que fait le système:

1. ✅ **Analyse le MX du destinataire**
   - Lookup DNS automatique
   - Détection du provider (Gmail, Outlook, etc)
   - Cache 48h pour performance

2. ✅ **Score tous les SMTP disponibles**
   - 5 facteurs pondérés
   - Scoring en temps réel
   - Tri par meilleur score

3. ✅ **Sélectionne automatiquement le meilleur SMTP**
   - Basé sur le score
   - Fallback si échec
   - Respect des rate limits

4. ✅ **Construit le FROM header intelligemment**
   - Display name: customDisplayName OU identity.displayName
   - FROM email: **TOUJOURS** smtpAccount.fromEmail
   - Format: "Display" <email>

5. ✅ **Envoie via le SMTP sélectionné**
   - Connection pooling
   - Retry automatique
   - Métriques complètes

### Ce que l'utilisateur contrôle:

- ✅ **Display name**: Peut être customisé par message
- ✅ **Identité par défaut**: Choix de l'identité
- ✅ **Destinataires**: Liste libre
- ✅ **Contenu**: Sujet, HTML, texte

### Ce que le système contrôle automatiquement:

- ✅ **SMTP sélectionné**: Basé sur scoring intelligent
- ✅ **FROM email**: Celui du SMTP sélectionné
- ✅ **Retry logic**: Fallback automatique
- ✅ **Rate limiting**: Respect automatique

---

## 🎯 EXEMPLE COMPLET

### Requête utilisateur

```json
POST /api/messages
{
  "identityId": "identity-uuid",
  "recipients": ["client@gmail.com", "user@outlook.com"],
  "subject": "Offre spéciale",
  "bodyHtml": "<p>Bonjour...</p>",
  "customDisplayName": "Support Premium",
  "trackingEnabled": true
}
```

### Traitement pour client@gmail.com

```
1. MX Lookup → google
2. Scoring:
   - AWS SES: 90 points (optimisé Gmail)
   - Titan: 87 points
   - SendGrid: 78 points
3. Sélection: AWS SES
4. FROM: "Support Premium <ses-account@acme.com>"
5. Envoi: SUCCESS (156ms)
6. Tracking: Pixel injecté, ID généré
```

### Traitement pour user@outlook.com

```
1. MX Lookup → microsoft
2. Scoring:
   - Titan: 92 points (optimisé Outlook)
   - AWS SES: 85 points
   - SendGrid: 80 points
3. Sélection: Titan Email
4. FROM: "Support Premium <titan-account@acme.com>"
5. Envoi: SUCCESS (198ms)
6. Tracking: Pixel injecté, ID généré
```

**Résultat**: Chaque destinataire reçoit l'email via le SMTP le plus optimisé pour son provider!

---

## 📝 CONCLUSION

### Le système est INTELLIGENT et AUTOMATIQUE

✅ **Routing SMTP**: Automatique basé sur scoring multi-facteurs
✅ **Display name**: Personnalisable par l'utilisateur
✅ **FROM email**: Automatique (SMTP sélectionné)
✅ **MX analysis**: Automatique avec cache
✅ **Fallback**: Automatique si échec
✅ **Tracking**: Automatique si enabled
✅ **Métriques**: Automatiques pour amélioration continue

**C'EST UN SYSTÈME DE CLASSE ENTREPRISE** 🚀
