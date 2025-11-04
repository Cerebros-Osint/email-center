# ⚡ Déploiement Render - Guide Ultra-Rapide

## 🎯 En 5 Étapes (15 minutes)

### ✅ Prérequis
- Compte GitHub
- Compte Render.com (gratuit)

---

## 📝 Étape 1: Pusher sur GitHub (2 min)

### Option A: Script Automatique
```powershell
.\deploy-to-render.ps1
```

### Option B: Manuelle
```powershell
# Initialiser git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "Deploy: Application ready for production"

# Ajouter le remote (remplacer USERNAME et REPO)
git remote add origin https://github.com/USERNAME/REPO.git

# Push
git push -u origin main
```

**Note:** Créez d'abord le repo sur https://github.com/new

---

## 📝 Étape 2: Déployer sur Render (1 min)

1. Aller sur https://dashboard.render.com
2. Login / Sign up
3. Cliquer **"New +"** → **"Blueprint"**
4. Connecter votre repo GitHub
5. Sélectionner le repo
6. Cliquer **"Apply"**

**Render va créer automatiquement:**
- ✅ PostgreSQL
- ✅ Redis
- ✅ Service Web
- ✅ Service Workers

**Temps de déploiement:** 5-8 minutes

---

## 📝 Étape 3: Configurer les Variables (5 min)

Une fois les services créés, ajouter ces variables:

### Service Web ET Workers

Dans Dashboard → Service → Environment:

| Variable | Valeur | Requis |
|----------|--------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://votre-app.onrender.com` | ✅ Oui |
| `SESSION_SECRET` | Auto-généré par Render ✅ | ✅ Oui |
| `ENCRYPTION_KEY` | Auto-généré par Render ✅ | ✅ Oui |

### Variables IMAP (Optionnel - pour recevoir emails)

| Variable | Exemple |
|----------|---------|
| `IMAP_HOST` | `imap.gmail.com` |
| `IMAP_PORT` | `993` |
| `IMAP_USER` | `votre-email@gmail.com` |
| `IMAP_PASS` | `votre-app-password` |
| `REPLY_DOMAIN` | `votredomain.com` |

### Variables SMTP (Optionnel - pour envoyer emails)

**AWS SES:**
- `SES_REGION`: `us-east-1`
- `SES_ACCESS_KEY_ID`: Votre key
- `SES_SECRET_ACCESS_KEY`: Votre secret

**Titan Email:**
- `TITAN_HOST`: `smtp.titan.email`
- `TITAN_PORT`: `587`
- `TITAN_USER`: Votre username
- `TITAN_PASS`: Votre password

---

## 📝 Étape 4: Initialiser la Base de Données (2 min)

### Via Render Shell

1. Dashboard → Service **email-software-web**
2. Cliquer **"Shell"** (en haut)
3. Attendre la connexion
4. Exécuter:

```bash
npx prisma db push
npm run db:seed
```

---

## 📝 Étape 5: Tester (1 min)

1. Ouvrir l'URL: `https://votre-app.onrender.com`
2. Se connecter:
   - Email: `admin@acme.com`
   - Password: `Pass456@`
3. ✅ Vous êtes connecté!

---

## 🎉 C'est Tout!

Votre application est en production! 🚀

---

## 📊 Checklist de Vérification

- [ ] Code pushé sur GitHub
- [ ] Blueprint appliqué sur Render
- [ ] Services créés (Web, Workers, DB, Redis)
- [ ] Variable `NEXT_PUBLIC_APP_URL` configurée
- [ ] Base de données initialisée
- [ ] Application accessible
- [ ] Login fonctionne

---

## 🔧 Commandes Utiles

### Mettre à Jour l'Application
```powershell
git add .
git commit -m "Update: description"
git push
# Render redéploie automatiquement ✅
```

### Voir les Logs
Dashboard → Service → Logs

### Accéder au Shell
Dashboard → Service → Shell

### Rollback
Dashboard → Service → Events → Sélectionner version → Rollback

---

## 💰 Coûts

### Gratuit (pour tester)
- ✅ Web service: 750h/mois
- ✅ PostgreSQL: 1GB
- ✅ Redis: 25MB
- ⚠️ Workers: Non inclus dans gratuit

### Payant (production)
- **Starter:** ~$7-25/mois
- **Standard:** ~$25-85/mois
- Inclut tous les services

---

## 🆘 Problèmes?

### Service ne démarre pas
→ Vérifier les logs (Dashboard → Service → Logs)

### Erreur "Can't reach database"
→ Vérifier que `DATABASE_URL` est bien configurée automatiquement

### Application lente
→ Tier gratuit "sleep" après 15 min d'inactivité
→ Upgrade vers plan payant pour éviter

### Workers ne fonctionnent pas
→ Workers nécessitent un plan payant
→ L'app web fonctionne quand même

---

## 📚 Documentation Complète

Pour plus de détails: **`DEPLOIEMENT_RENDER_GUIDE.md`**

---

## 🎯 Prochaines Étapes

1. **Changer le mot de passe admin**
   - Settings → Users → Changer password

2. **Configurer les comptes SMTP**
   - Settings → SMTP Accounts → Add Account

3. **Configurer un domaine custom** (optionnel)
   - Dashboard → Service → Custom Domain

4. **Activer les backups**
   - Dashboard → Database → Settings → Backups

---

## 📞 Support

- **Documentation Render:** https://render.com/docs
- **Status:** https://status.render.com
- **Support:** support@render.com

---

**Besoin d'aide pour le déploiement? Consultez DEPLOIEMENT_RENDER_GUIDE.md**
