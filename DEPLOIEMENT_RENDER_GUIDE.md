# 🚀 Guide de Déploiement sur Render.com

## 📋 Prérequis

- ✅ Compte GitHub
- ✅ Compte Render.com (gratuit)
- ✅ Code sans erreurs (déjà fait ✅)
- ✅ `render.yaml` configuré (déjà fait ✅)

---

## 🎯 Vue d'ensemble du Déploiement

Render va créer automatiquement:
- ✅ **Service Web** (Application Next.js)
- ✅ **Service Workers** (Background jobs)
- ✅ **PostgreSQL** (Base de données)
- ✅ **Redis** (Cache et queues)

**Coût:** Gratuit pour tester (tier gratuit disponible)

---

## 📝 Étape 1: Préparer le Code pour GitHub

### A. Initialiser Git (si pas déjà fait)

```powershell
# Vérifier si git est initialisé
git status

# Si erreur "not a git repository", initialiser:
git init
git add .
git commit -m "Initial commit - Application Email Software ready for production"
```

### B. Créer un Repo GitHub

1. Aller sur https://github.com/new
2. Nom du repo: `email-software-production` (ou autre)
3. **Important:** Laisser en **Private** si vous avez des credentials
4. Ne pas initialiser avec README (on a déjà le code)
5. Cliquer "Create repository"

### C. Pusher le Code

```powershell
# Remplacer USERNAME et REPO par vos valeurs
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

**Note:** Si vous avez des credentials sensibles dans `.env`, ils ne seront PAS pushés (`.env` est dans `.gitignore` ✅)

---

## 📝 Étape 2: Déployer sur Render

### A. Connecter GitHub à Render

1. Aller sur https://dashboard.render.com
2. Sign Up / Login (avec GitHub c'est plus simple)
3. Autoriser l'accès à vos repos GitHub

### B. Créer le Déploiement via Blueprint

1. Dans le dashboard Render, cliquer **"New +"** → **"Blueprint"**
2. Connecter votre repo GitHub
3. Sélectionner le repo `email-software-production`
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquer **"Apply"**

### C. Render va créer automatiquement:

- ✅ Base de données PostgreSQL (email-software-db)
- ✅ Redis (email-software-redis)
- ✅ Service Web (email-software-web)
- ✅ Service Workers (email-software-workers)

**Temps:** 5-10 minutes pour le premier déploiement

---

## 📝 Étape 3: Configurer les Variables d'Environnement

Render génère automatiquement certaines variables, mais vous devez ajouter les autres:

### A. Variables à Configurer Manuellement

Dans le dashboard Render, pour **chaque service** (Web + Workers):

#### Variables Requises (Web et Workers)

| Variable | Valeur | Où la trouver |
|----------|--------|---------------|
| `NEXT_PUBLIC_APP_URL` | `https://votre-app.onrender.com` | URL de votre service web |
| `SESSION_SECRET` | Auto-généré ✅ | Render génère |
| `ENCRYPTION_KEY` | Auto-généré ✅ | Render génère |

#### Variables IMAP (pour recevoir des emails)

| Variable | Exemple | Description |
|----------|---------|-------------|
| `IMAP_HOST` | `imap.gmail.com` | Serveur IMAP |
| `IMAP_PORT` | `993` | Port IMAP SSL |
| `IMAP_USER` | `votre-email@gmail.com` | Email IMAP |
| `IMAP_PASS` | `votre-app-password` | Mot de passe |
| `REPLY_DOMAIN` | `votredomain.com` | Domaine pour replies |

#### Variables SMTP (optionnelles - pour envoyer)

**AWS SES:**
| Variable | Description |
|----------|-------------|
| `SES_REGION` | `us-east-1` |
| `SES_ACCESS_KEY_ID` | Votre access key AWS |
| `SES_SECRET_ACCESS_KEY` | Votre secret key AWS |

**Titan Email:**
| Variable | Description |
|----------|-------------|
| `TITAN_HOST` | `smtp.titan.email` |
| `TITAN_PORT` | `587` |
| `TITAN_USER` | Votre username |
| `TITAN_PASS` | Votre password |

### B. Comment Ajouter les Variables

1. Dans le dashboard Render
2. Cliquer sur votre service (Web ou Workers)
3. Onglet **"Environment"**
4. Cliquer **"Add Environment Variable"**
5. Ajouter chaque variable
6. Cliquer **"Save Changes"**

**Important:** Les services vont redémarrer automatiquement après les changements.

---

## 📝 Étape 4: Initialiser la Base de Données

Une fois les services déployés:

### A. Via Render Shell

1. Dans le dashboard, aller sur **email-software-web**
2. Cliquer **"Shell"** (dans le menu en haut)
3. Attendre que le shell se connecte
4. Exécuter:

```bash
# Appliquer les migrations
npx prisma db push

# Charger les données de test
npm run db:seed
```

### B. Via Local (Alternative)

Si vous avez les credentials de la DB:

```powershell
# Copier l'URL de connexion PostgreSQL depuis Render
# Format: postgresql://user:password@host:port/database

# Dans votre .env local, temporairement:
DATABASE_URL="postgresql://user:password@host:port/database"

# Puis:
npx prisma db push
npm run db:seed
```

---

## 📝 Étape 5: Vérifier le Déploiement

### A. Vérifier les Services

Dans le dashboard Render:

| Service | Statut | URL/Info |
|---------|--------|----------|
| email-software-web | ✅ Live | https://votre-app.onrender.com |
| email-software-workers | ✅ Running | (Pas d'URL publique) |
| email-software-db | ✅ Available | (Connexion interne) |
| email-software-redis | ✅ Available | (Connexion interne) |

### B. Tester l'Application

1. Ouvrir l'URL de votre service: `https://votre-app.onrender.com`
2. Vous devriez voir la page de login
3. Se connecter avec:
   - Email: `admin@acme.com`
   - Password: `Pass456@`

### C. Vérifier les Logs

Pour chaque service:
1. Cliquer sur le service dans le dashboard
2. Onglet **"Logs"**
3. Vérifier qu'il n'y a pas d'erreurs

**Logs attendus:**
- Web: `✓ Ready in X.Xs`, `Listening on port 3000`
- Workers: `Starting all 7 workers...`, `✓ Workers started successfully`

---

## 📝 Étape 6: Configuration Post-Déploiement

### A. Configurer les Comptes SMTP

1. Se connecter à l'application
2. Aller dans **Settings** → **SMTP Accounts**
3. Ajouter vos comptes SMTP (AWS SES, Titan, etc.)
4. Tester la connexion

### B. Configurer DNS (Optionnel)

Si vous voulez utiliser votre propre domaine:

1. Dans Render, aller sur **email-software-web**
2. Onglet **"Settings"**
3. Section **"Custom Domain"**
4. Ajouter votre domaine
5. Configurer les DNS selon les instructions Render

---

## 🔧 Maintenance et Mises à Jour

### Déploiement Automatique

**Déjà configuré! ✅**

Chaque fois que vous pushez sur GitHub:
```powershell
git add .
git commit -m "Update: description des changements"
git push
```

Render va automatiquement:
1. Détecter le push
2. Rebuilder l'application
3. Déployer la nouvelle version
4. Zero-downtime deployment

### Voir les Déploiements

Dashboard → Service → Onglet **"Events"**

---

## 💰 Coûts Render

### Tier Gratuit (pour tester)

| Service | Gratuit | Limites |
|---------|---------|---------|
| Web Service | ✅ Oui | 750h/mois, sleep après inactivité |
| PostgreSQL | ✅ Oui | 1GB, 90 jours |
| Redis | ✅ Oui | 25MB, 90 jours |
| Workers | ⚠️ Non | Nécessite plan payant |

**Note:** Pour un usage sérieux, le plan Starter est recommandé (~$7-25/mois)

### Plans Payants

| Plan | Prix/mois | Idéal pour |
|------|-----------|------------|
| Starter | $7-25 | Développement, petits projets |
| Standard | $25-85 | Production, scaling |
| Pro | $85+ | Haute disponibilité |

---

## 🆘 Troubleshooting

### Service ne démarre pas

**Vérifier:**
1. Les logs du service (onglet Logs)
2. Que toutes les variables d'environnement sont définies
3. Que la base de données est accessible

**Erreurs communes:**
```
Error: P1001 - Can't reach database
→ Vérifier DATABASE_URL est bien configurée

Error: Redis connection failed
→ Vérifier REDIS_URL est bien configurée

Build failed: Module not found
→ Vérifier package.json est à jour dans GitHub
```

### Application lente au démarrage

**Cause:** Le tier gratuit "sleep" après 15 min d'inactivité

**Solutions:**
- Upgrade vers plan payant ($7/mois)
- Ou accepter le délai au premier accès (~30 secondes)

### Base de données pleine

**Tier gratuit:** 1GB max

**Solutions:**
1. Nettoyer les vieilles données
2. Upgrade vers plan payant (10GB+)

### Workers ne fonctionnent pas

**Cause:** Workers nécessitent un plan payant

**Solutions:**
- Upgrade vers Starter plan
- Ou désactiver temporairement les workers (l'app web fonctionnera quand même)

---

## 📊 Checklist de Déploiement

- [ ] Code pushé sur GitHub
- [ ] Blueprint appliqué sur Render
- [ ] Tous les services créés (Web, Workers, DB, Redis)
- [ ] Variables d'environnement configurées
- [ ] `NEXT_PUBLIC_APP_URL` définie
- [ ] Credentials IMAP ajoutés (si inbox utilisé)
- [ ] Credentials SMTP ajoutés (si envoi utilisé)
- [ ] Base de données initialisée (`prisma db push`)
- [ ] Données de test chargées (`db:seed`)
- [ ] Application accessible via URL
- [ ] Login fonctionne
- [ ] Logs sans erreurs
- [ ] Comptes SMTP configurés dans l'interface
- [ ] Tests d'envoi d'emails réussis

---

## 🔐 Sécurité en Production

### ✅ Déjà Sécurisé

- Secrets auto-générés par Render
- HTTPS automatique
- Variables d'environnement chiffrées
- Connexions DB sécurisées
- Code sans credentials hardcodés

### 🔒 Recommandations Supplémentaires

1. **Changer les mots de passe par défaut**
   - Changer le mot de passe `Pass456@` du user admin
   - Créer de nouveaux utilisateurs

2. **Configurer les backups DB**
   - Render fait des backups automatiques
   - Configurer la rétention dans Settings

3. **Monitoring**
   - Activer les alertes Render
   - Configurer les health checks

4. **Rate Limiting**
   - Déjà implémenté dans le code ✅
   - Ajuster les limites dans Settings

---

## 📚 Ressources

- **Documentation Render:** https://render.com/docs
- **Status Render:** https://status.render.com
- **Support:** support@render.com
- **Communauté:** https://community.render.com

---

## 🎉 C'est Tout!

Votre application Email Software est maintenant en production sur Render! 🚀

**Prochaines étapes:**
1. Configurer vos comptes SMTP
2. Configurer votre domaine custom (optionnel)
3. Inviter des utilisateurs
4. Commencer à envoyer des emails

---

## 📝 Commandes Utiles

### Accéder au Shell Render
```bash
# Via dashboard: Service → Shell
# Ou via CLI Render
```

### Voir les Logs en Temps Réel
```bash
# Via dashboard: Service → Logs
# Ou via CLI Render
```

### Rollback à une Version Précédente
```
Dashboard → Service → Events → Sélectionner déploiement → Rollback
```

---

**Besoin d'aide? Consultez les logs ou contactez le support Render.**
