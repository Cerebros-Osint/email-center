# ⚡ Déploiement Rapide via Blueprint Render

## 🚨 Problème Actuel

L'application démarre mais **DATABASE_URL n'est pas configurée** car les bases de données PostgreSQL et Redis n'existent pas encore.

---

## ✅ Solution: Déployer via Blueprint

### Étape 1: Supprimer le Service Actuel ❌

1. Aller sur https://dashboard.render.com
2. Cliquer sur votre service `email-software-web` (ou similaire)
3. **Settings** → Scroll en bas → **Delete Web Service**

### Étape 2: Créer via Blueprint 📋

1. Dashboard Render → **"New +"** → **"Blueprint"**
2. Connecter le repo: `Cerebros-Osint/email-center`
3. Render détecte `render.yaml` automatiquement
4. Nom du Blueprint: `email-software`
5. **Apply**

### Étape 3: Attendre ⏳

Render crée automatiquement (10-15 min):
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ Web Service
- ✅ Worker Service

Toutes les variables d'environnement sont **automatiquement liées**!

### Étape 4: Configurer Variables Optionnelles 🔧

Dans **email-software-web** → Environment, ajouter:

```
NEXT_PUBLIC_APP_URL=https://[votre-url].onrender.com
IMAP_HOST=imap.gmail.com
IMAP_USER=votre@email.com
IMAP_PASS=votre-mot-de-passe
REPLY_DOMAIN=votre-domaine.com
```

### Étape 5: Initialiser la DB 💾

Une fois déployé, dans **Shell**:
```bash
npx prisma db push
npm run db:seed
```

### Étape 6: Connexion 🎉

URL: Votre URL Render

Login:
- `admin@acme.com`
- `Pass456@`

---

## 🆚 Pourquoi Blueprint vs Service Manuel?

| Blueprint | Service Manuel |
|-----------|----------------|
| ✅ Crée DB automatiquement | ❌ Vous devez créer DB manuellement |
| ✅ Lie les variables automatiquement | ❌ Vous devez copier/coller les URLs |
| ✅ Déploie tous les services ensemble | ❌ Déploiement service par service |
| ✅ Configuration dans `render.yaml` | ❌ Configuration via UI |

---

## ⚠️ Alternative: Configuration Manuelle

Si vous ne voulez PAS supprimer le service actuel:

1. Dashboard → **"New +"** → **"PostgreSQL"**
   - Name: `email-software-db`
   - Database: `emailapp`
   - User: `emailapp`

2. Dashboard → **"New +"** → **"Redis"**
   - Name: `email-software-redis`

3. Dans votre service web → **Environment**:
   - Copier `DATABASE_URL` depuis PostgreSQL
   - Copier `REDIS_URL` depuis Redis
   - Coller dans les variables d'environnement

4. **Redéployer** le service

Mais cette méthode est **plus longue et plus sujette aux erreurs**.

---

## 🎯 Recommandation

**Utilisez le Blueprint!** C'est la méthode la plus fiable et la plus rapide.
