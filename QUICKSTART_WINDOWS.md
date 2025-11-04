# ⚡ Démarrage Ultra-Rapide (Windows)

## 🎯 En 3 Étapes

### 1️⃣ Installer Docker Desktop (si pas encore fait)
- Télécharger : https://www.docker.com/products/docker-desktop
- Installer et redémarrer

### 2️⃣ Lancer le Script Automatique
```powershell
.\start-app.ps1
```

### 3️⃣ Accéder à l'application
- URL : http://localhost:3000
- Login : `admin@acme.com`
- Pass : `Pass456@`

---

## ⚠️ Si Docker n'est pas disponible

### Installation Manuelle

#### 1. Installer PostgreSQL
- Télécharger : https://www.postgresql.org/download/windows/
- Installer avec port 5432
- Créer la base `emailapp`

#### 2. Installer Redis
- **WSL** : `sudo apt-get install redis` puis `sudo service redis-server start`
- **OU Memurai** : https://www.memurai.com/get-memurai

#### 3. Configurer .env
```env
DATABASE_URL="postgresql://postgres:motdepasse@localhost:5432/emailapp"
REDIS_URL="redis://localhost:6379"
```

#### 4. Démarrer
```powershell
# Générer les secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copier dans .env comme SESSION_SECRET et ENCRYPTION_KEY

# Initialiser
npx prisma generate
npx prisma db push
npm run db:seed

# Lancer (2 terminaux)
npm run dev           # Terminal 1
npm run worker:all    # Terminal 2
```

---

## 📚 Documentation Complète

- **Guide Détaillé** : `DEMARRAGE_COMPLET.md`
- **Installation Services** : `INSTALLATION_SERVICES.md`
- **Architecture** : `README.md`

---

## 🆘 Problèmes ?

### Port déjà utilisé
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Services non accessibles
```powershell
# Vérifier
Test-NetConnection localhost -Port 5432  # PostgreSQL
Test-NetConnection localhost -Port 6379  # Redis

# Redémarrer Docker
docker-compose restart
```

### Erreurs de build
```powershell
# Nettoyer et rebuild
Remove-Item .next -Recurse -Force
npm run build
```

---

## ✅ Statut Actuel

- ✅ Erreurs TypeScript corrigées
- ✅ Build Next.js réussi
- ✅ Documentation complète
- ✅ Scripts de démarrage créés
- ✅ Docker Compose configuré
- ⚠️ **Services Redis/PostgreSQL à démarrer**

---

## 🚀 Prêt à Lancer !

```powershell
.\start-app.ps1
```
