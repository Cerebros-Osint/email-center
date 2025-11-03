# 🐘 GUIDE PostgreSQL pour Windows

## 🔴 PROBLÈME ACTUEL

Vous voyez cette erreur:
```
Can't reach database server at `localhost:5432`
```

**Cause**: PostgreSQL n'est pas démarré ou pas installé.

---

## ✅ SOLUTION 1: Démarrer PostgreSQL (si installé)

### Vérifier si installé:
```powershell
psql --version
# Devrait afficher: psql (PostgreSQL) 16.x
```

### Démarrer le service:

#### Méthode A - Via PowerShell (Admin):
```powershell
# Lister les services PostgreSQL
Get-Service -Name "*postgresql*"

# Démarrer (remplacer par le nom exact)
Start-Service postgresql-x64-16
# OU
net start postgresql-x64-16
```

#### Méthode B - Via Services Windows:
1. Appuyez sur `Win + R`
2. Tapez `services.msc` et validez
3. Cherchez "postgresql" dans la liste
4. Clic droit → "Démarrer"
5. Clic droit → Propriétés → Type de démarrage: "Automatique"

#### Méthode C - Via pgAdmin:
1. Ouvrir pgAdmin 4
2. Le serveur devrait se connecter automatiquement
3. Sinon, clic droit sur serveur → "Connect"

### Vérifier que ça fonctionne:
```powershell
psql -U postgres -c "SELECT version();"
```

### Créer la base de données:
```powershell
# Se connecter
psql -U postgres

# Créer la base
CREATE DATABASE emailapp;

# Vérifier
\l

# Quitter
\q
```

### Retour au projet:
```powershell
cd C:\Users\Administrator\Desktop\Email-Software-complet
npx prisma db push
npm run db:seed
```

---

## ✅ SOLUTION 2: Installer PostgreSQL

### Téléchargement:
https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

**Version recommandée:** PostgreSQL 16.x for Windows x86-64

### Installation:
1. Exécuter l'installeur
2. **Mot de passe**: Utiliser `password` (ou noter le vôtre)
3. Port: Laisser `5432`
4. Locale: Laisser par défaut
5. Installer tous les composants

### Après installation:
```powershell
# Vérifier
psql --version

# Créer la base
createdb -U postgres emailapp

# Tester
psql -U postgres -d emailapp
\dt
\q
```

### Retour au projet:
```powershell
cd C:\Users\Administrator\Desktop\Email-Software-complet

# Vérifier .env (mot de passe doit correspondre)
# DATABASE_URL="postgresql://postgres:password@localhost:5432/emailapp"
#                            ^^^^^^ ^^^^^^^^
#                            user   votre mot de passe

npx prisma db push
npm run db:seed
npm run dev
```

---

## ✅ SOLUTION 3: Utiliser SQLite (RAPIDE)

Si vous voulez tester **immédiatement** sans installer PostgreSQL:

### Basculer vers SQLite:
```powershell
# Utiliser le script fourni
.\use-sqlite.ps1

# OU manuellement:
Copy-Item .env.sqlite .env -Force
Copy-Item prisma\schema.sqlite.prisma prisma\schema.prisma -Force
```

### Setup SQLite:
```powershell
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

**Avantages SQLite:**
- ✅ Pas d'installation
- ✅ Fichier local (./dev.db)
- ✅ Parfait pour développement

**Inconvénients:**
- ⚠️ Moins de features que PostgreSQL
- ⚠️ Pas pour production

---

## 🔍 DIAGNOSTIC

### Vérifier si PostgreSQL est installé:
```powershell
# Chercher le dossier d'installation
Test-Path "C:\Program Files\PostgreSQL"

# Chercher le service
Get-Service -Name "*postgres*"

# Version installée
psql --version
```

### Vérifier le port 5432:
```powershell
# Voir ce qui écoute sur le port 5432
netstat -ano | findstr :5432
```

### Logs PostgreSQL:
```powershell
# Généralement dans:
# C:\Program Files\PostgreSQL\16\data\log\
Get-Content "C:\Program Files\PostgreSQL\16\data\log\*.log" -Tail 50
```

---

## ⚙️ CONFIGURATION .env

### Pour PostgreSQL local:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/emailapp"
```

### Avec mot de passe différent:
```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/emailapp"
```

### Avec utilisateur différent:
```env
DATABASE_URL="postgresql://VOTRE_USER:VOTRE_PASS@localhost:5432/emailapp"
```

### PostgreSQL distant:
```env
DATABASE_URL="postgresql://user:pass@192.168.1.100:5432/emailapp"
```

---

## 🆘 DÉPANNAGE

### Erreur: "psql: command not found"
PostgreSQL n'est pas installé ou pas dans le PATH.

**Solution:**
1. Installer PostgreSQL
2. OU ajouter au PATH: `C:\Program Files\PostgreSQL\16\bin`

### Erreur: "FATAL: password authentication failed"
Mauvais mot de passe dans .env

**Solution:**
Vérifier DATABASE_URL dans .env

### Erreur: "database emailapp does not exist"
La base n'a pas été créée.

**Solution:**
```powershell
createdb -U postgres emailapp
```

### Service ne démarre pas
Conflit de port ou installation corrompue.

**Solution:**
1. Vérifier les logs
2. Réinstaller PostgreSQL
3. OU utiliser SQLite

---

## 🎯 RECOMMANDATION

### Pour développement local:
**→ Utiliser SQLite** (solution rapide, aucune installation)

### Pour tests complets:
**→ Installer PostgreSQL** (features complètes, production-like)

### Pour production:
**→ PostgreSQL obligatoire** (performances, scalabilité)

---

## 📝 COMMANDES RAPIDES

### Démarrer PostgreSQL:
```powershell
net start postgresql-x64-16
```

### Créer base:
```powershell
createdb -U postgres emailapp
```

### Ou utiliser SQLite:
```powershell
.\use-sqlite.ps1
npx prisma db push
npm run db:seed
```

---

**CHOISISSEZ LA SOLUTION QUI VOUS CONVIENT** ✅
