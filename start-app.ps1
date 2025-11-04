# Script de démarrage complet pour l'application Email Software
# Ce script vérifie et démarre tous les services nécessaires

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EMAIL SOFTWARE - DEMARRAGE COMPLET   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour vérifier si un port est ouvert
function Test-Port {
    param(
        [string]$Host = "localhost",
        [int]$Port
    )
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient($Host, $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Fonction pour démarrer Docker Compose
function Start-DockerServices {
    Write-Host "Verification de Docker..." -ForegroundColor Yellow
    
    $dockerAvailable = $false
    try {
        $dockerVersion = docker --version 2>$null
        if ($?) {
            Write-Host "[OK] Docker detecte: $dockerVersion" -ForegroundColor Green
            
            Write-Host "`nDemarrage des services Docker (PostgreSQL + Redis)..." -ForegroundColor Yellow
            docker-compose up -d
            
            if ($?) {
                Write-Host "[OK] Services Docker demarres avec succes" -ForegroundColor Green
                
                # Attendre que les services soient prets
                Write-Host "`nAttente de la disponibilite des services..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
                
                return $true
            }
            else {
                Write-Host "[ERREUR] Erreur lors du demarrage des services Docker" -ForegroundColor Red
                return $false
            }
        }
        else {
            Write-Host "[ERREUR] Docker n'est pas installe ou n'est pas dans le PATH" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "[ERREUR] Erreur Docker: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Etape 1: Verifier les fichiers .env
Write-Host "1. Verification de la configuration..." -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host "[OK] Fichier .env trouve" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] Fichier .env non trouve" -ForegroundColor Red
    Write-Host "  Creation depuis .env.example..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] Fichier .env cree" -ForegroundColor Green
        Write-Host "[IMPORTANT] Editez le fichier .env avec vos valeurs" -ForegroundColor Yellow
        Write-Host "  Générez les secrets avec:" -ForegroundColor Yellow
        Write-Host "    node -e ""console.log(require('crypto').randomBytes(32).toString('base64'))""" -ForegroundColor Gray
        Write-Host "    node -e ""console.log(require('crypto').randomBytes(32).toString('hex'))""" -ForegroundColor Gray
    }
    else {
        Write-Host "[ERREUR] Fichier .env.example non trouve" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Etape 2: Demarrer les services (Docker ou manuel)
Write-Host "2. Demarrage des services..." -ForegroundColor Cyan
$dockerStarted = Start-DockerServices

if (-not $dockerStarted) {
    Write-Host "`n[ATTENTION] Docker n'est pas disponible" -ForegroundColor Yellow
    Write-Host "Verification des services manuels..." -ForegroundColor Yellow
}

# Verifier PostgreSQL
Write-Host "`nVerification de PostgreSQL (port 5432)..." -ForegroundColor Yellow
if (Test-Port -Port 5432) {
    Write-Host "[OK] PostgreSQL est accessible" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] PostgreSQL n'est pas accessible" -ForegroundColor Red
    Write-Host "  Consultez INSTALLATION_SERVICES.md pour l'installation" -ForegroundColor Yellow
    $continue = Read-Host "Continuer quand même? (o/N)"
    if ($continue -ne "o") {
        exit 1
    }
}

# Verifier Redis
Write-Host "`nVerification de Redis (port 6379)..." -ForegroundColor Yellow
if (Test-Port -Port 6379) {
    Write-Host "[OK] Redis est accessible" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] Redis n'est pas accessible" -ForegroundColor Red
    Write-Host "  Consultez INSTALLATION_SERVICES.md pour l'installation" -ForegroundColor Yellow
    $continue = Read-Host "Continuer quand même? (o/N)"
    if ($continue -ne "o") {
        exit 1
    }
}

Write-Host ""

# Etape 3: Verifier node_modules
Write-Host "3. Verification des dependances..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "[OK] node_modules trouve" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] node_modules non trouve" -ForegroundColor Red
    Write-Host "  Installation des dependances..." -ForegroundColor Yellow
    npm install
    if ($?) {
        Write-Host "[OK] Dependances installees" -ForegroundColor Green
    }
    else {
        Write-Host "[ERREUR] Erreur lors de l'installation" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Etape 4: Generer le client Prisma
Write-Host "4. Generation du client Prisma..." -ForegroundColor Cyan
npx prisma generate
if ($?) {
    Write-Host "[OK] Client Prisma genere" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] Erreur lors de la generation" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Etape 5: Initialiser la base de donnees
Write-Host "5. Initialisation de la base de donnees..." -ForegroundColor Cyan
$initDb = Read-Host "Voulez-vous initialiser/mettre a jour la base de donnees? (O/n)"
if ($initDb -ne "n") {
    Write-Host "  Mise a jour du schema..." -ForegroundColor Yellow
    npx prisma db push
    
    if ($?) {
        Write-Host "[OK] Base de donnees initialisee" -ForegroundColor Green
        
        $seed = Read-Host "  Charger les donnees de test? (O/n)"
        if ($seed -ne "n") {
            npm run db:seed
            if ($?) {
                Write-Host "[OK] Donnees de test chargees" -ForegroundColor Green
            }
        }
    }
    else {
        Write-Host "[ERREUR] Erreur lors de l'initialisation" -ForegroundColor Red
    }
}

Write-Host ""

# Etape 6: Build (optionnel)
$build = Read-Host "6. Voulez-vous rebuilder l'application? (o/N)"
if ($build -eq "o") {
    Write-Host "  Building..." -ForegroundColor Yellow
    npm run build
    if ($?) {
        Write-Host "[OK] Build reussi" -ForegroundColor Green
    }
    else {
        Write-Host "[ERREUR] Build echoue" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEMARRAGE DE L'APPLICATION           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Afficher les informations
Write-Host "Informations:" -ForegroundColor Yellow
Write-Host "  - Application Web: http://localhost:3000" -ForegroundColor White
Write-Host "  - Login par defaut: admin@acme.com / Pass456@" -ForegroundColor White
Write-Host "  - Prisma Studio: npm run db:studio" -ForegroundColor White
Write-Host ""

# Demander le mode de demarrage
Write-Host "Mode de demarrage:" -ForegroundColor Yellow
Write-Host "  1. Developpement (npm run dev)" -ForegroundColor White
Write-Host "  2. Production (npm start)" -ForegroundColor White
Write-Host "  3. Sans workers (Web seulement)" -ForegroundColor White
Write-Host "  4. Workers uniquement" -ForegroundColor White
Write-Host "  5. Quitter" -ForegroundColor White
Write-Host ""

$mode = Read-Host "Choisissez le mode (1-5)"

switch ($mode) {
    "1" {
        Write-Host "`n[DEMARRAGE] Mode developpement..." -ForegroundColor Green
        Write-Host "  Terminal actuel: Application Web" -ForegroundColor Yellow
        Write-Host "  [IMPORTANT] Ouvrez un NOUVEAU terminal et lancez: npm run worker:all" -ForegroundColor Yellow
        Write-Host ""
        Start-Sleep -Seconds 2
        npm run dev
    }
    "2" {
        Write-Host "`n[DEMARRAGE] Mode production..." -ForegroundColor Green
        Write-Host "  Terminal actuel: Application Web" -ForegroundColor Yellow
        Write-Host "  [IMPORTANT] Ouvrez un NOUVEAU terminal et lancez: npm run worker:all" -ForegroundColor Yellow
        Write-Host ""
        Start-Sleep -Seconds 2
        npm start
    }
    "3" {
        Write-Host "`n[DEMARRAGE] Web uniquement..." -ForegroundColor Green
        npm run dev
    }
    "4" {
        Write-Host "`n[DEMARRAGE] Workers uniquement..." -ForegroundColor Green
        npm run worker:all
    }
    "5" {
        Write-Host "`nAu revoir!" -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "`n[ERREUR] Option invalide" -ForegroundColor Red
        exit 1
    }
}
