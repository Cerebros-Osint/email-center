# Script d'installation automatique PostgreSQL + Redis pour Windows
# Utilise Chocolatey pour une installation rapide

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION SERVICES - WINDOWS      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier les privilèges admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ATTENTION] Ce script necessite des privileges administrateur" -ForegroundColor Yellow
    Write-Host "Relancez PowerShell en tant qu'administrateur" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

# Fonction pour vérifier si Chocolatey est installé
function Test-Chocolatey {
    try {
        $null = choco --version 2>$null
        return $?
    }
    catch {
        return $false
    }
}

# Installer Chocolatey si nécessaire
Write-Host "1. Verification de Chocolatey..." -ForegroundColor Cyan
if (Test-Chocolatey) {
    Write-Host "[OK] Chocolatey est installe" -ForegroundColor Green
}
else {
    Write-Host "[INFO] Chocolatey n'est pas installe" -ForegroundColor Yellow
    Write-Host "Installation de Chocolatey..." -ForegroundColor Yellow
    
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Host "[OK] Chocolatey installe avec succes" -ForegroundColor Green
        
        # Recharger les variables d'environnement
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    catch {
        Write-Host "[ERREUR] Impossible d'installer Chocolatey: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Installation manuelle requise - consultez INSTALLATION_SERVICES.md" -ForegroundColor Yellow
        Read-Host "Appuyez sur Entree pour quitter"
        exit 1
    }
}

Write-Host ""

# Installer PostgreSQL
Write-Host "2. Installation de PostgreSQL..." -ForegroundColor Cyan
$pgInstalled = Get-Command psql -ErrorAction SilentlyContinue

if ($pgInstalled) {
    Write-Host "[OK] PostgreSQL est deja installe" -ForegroundColor Green
}
else {
    Write-Host "Installation de PostgreSQL via Chocolatey..." -ForegroundColor Yellow
    choco install postgresql15 -y --params "/Password:postgres123"
    
    if ($?) {
        Write-Host "[OK] PostgreSQL installe" -ForegroundColor Green
        Write-Host "[INFO] Mot de passe PostgreSQL: postgres123" -ForegroundColor Yellow
        
        # Attendre que le service démarre
        Write-Host "Attente du demarrage du service PostgreSQL..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Recharger PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    else {
        Write-Host "[ATTENTION] Erreur lors de l'installation de PostgreSQL" -ForegroundColor Yellow
    }
}

Write-Host ""

# Installer Redis
Write-Host "3. Installation de Redis (Memurai)..." -ForegroundColor Cyan
Write-Host "[INFO] Redis natif n'existe pas pour Windows, installation de Memurai (compatible)" -ForegroundColor Yellow

try {
    choco install memurai-developer -y
    
    if ($?) {
        Write-Host "[OK] Memurai (Redis) installe" -ForegroundColor Green
        Write-Host "Attente du demarrage du service..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
    else {
        Write-Host "[ATTENTION] Erreur lors de l'installation de Memurai" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "[ATTENTION] Memurai non disponible via Chocolatey" -ForegroundColor Yellow
    Write-Host "Alternative: Utilisez WSL ou Docker pour Redis" -ForegroundColor Yellow
}

Write-Host ""

# Créer la base de données PostgreSQL
Write-Host "4. Creation de la base de donnees..." -ForegroundColor Cyan

try {
    # Attendre que PostgreSQL soit prêt
    $maxRetries = 5
    $retry = 0
    $pgReady = $false
    
    while (-not $pgReady -and $retry -lt $maxRetries) {
        try {
            $testConnection = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
            if ($testConnection.TcpTestSucceeded) {
                $pgReady = $true
            }
            else {
                $retry++
                Write-Host "Attente de PostgreSQL... (tentative $retry/$maxRetries)" -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }
        }
        catch {
            $retry++
            Start-Sleep -Seconds 5
        }
    }
    
    if ($pgReady) {
        Write-Host "PostgreSQL est pret, creation de la base de donnees..." -ForegroundColor Yellow
        
        # Créer la base de données
        $env:PGPASSWORD = "postgres123"
        & psql -U postgres -c "CREATE DATABASE emailapp;" 2>$null
        
        if ($?) {
            Write-Host "[OK] Base de donnees 'emailapp' creee" -ForegroundColor Green
        }
        else {
            Write-Host "[INFO] Base de donnees existe peut-etre deja" -ForegroundColor Yellow
        }
        
        Remove-Item Env:\PGPASSWORD
    }
    else {
        Write-Host "[ATTENTION] Impossible de se connecter a PostgreSQL" -ForegroundColor Yellow
        Write-Host "Vous devrez creer la base manuellement" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "[ATTENTION] Erreur lors de la creation de la base: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Vérifier les services
Write-Host "5. Verification des services..." -ForegroundColor Cyan

$pgRunning = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
$redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue

if ($pgRunning.TcpTestSucceeded) {
    Write-Host "[OK] PostgreSQL est accessible sur le port 5432" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] PostgreSQL n'est pas accessible" -ForegroundColor Red
    Write-Host "Verifiez le service dans services.msc" -ForegroundColor Yellow
}

if ($redisRunning.TcpTestSucceeded) {
    Write-Host "[OK] Redis est accessible sur le port 6379" -ForegroundColor Green
}
else {
    Write-Host "[ATTENTION] Redis n'est pas accessible" -ForegroundColor Yellow
    Write-Host "Alternative: L'application peut fonctionner en mode degrade" -ForegroundColor Yellow
}

Write-Host ""

# Mettre à jour le fichier .env
Write-Host "6. Configuration du fichier .env..." -ForegroundColor Cyan

$envContent = @"
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/emailapp"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth & Security
SESSION_SECRET="$((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32) | ForEach-Object { $_.ToString("x2") } | Join-String)"
ENCRYPTION_KEY="$([System.Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetNonZeroBytes(32)))"

# IMAP (optionnel)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="votre-email@gmail.com"
IMAP_PASS="votre-app-password"
REPLY_DOMAIN="example.com"

# AWS SES (optionnel)
SES_REGION="us-east-1"
SES_ACCESS_KEY_ID=""
SES_SECRET_ACCESS_KEY=""

# Titan Email (optionnel)
TITAN_HOST="smtp.titan.email"
TITAN_PORT="587"
TITAN_USER=""
TITAN_PASS=""

# Route53 (optionnel)
ROUTE53_ACCESS_KEY_ID=""
ROUTE53_SECRET_ACCESS_KEY=""
ROUTE53_REGION="us-east-1"

# Cloudflare (optionnel)
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_ZONE_ID=""

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Seed credentials
SEED_SES_USERNAME="demo-ses"
SEED_SES_PASSWORD="demo-password"
SEED_TITAN_USERNAME="demo-titan"
SEED_TITAN_PASSWORD="demo-password"
"@

Set-Content -Path ".env" -Value $envContent -Force
Write-Host "[OK] Fichier .env configure" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION TERMINEE                " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "1. Fermer et reouvrir PowerShell (pour recharger PATH)" -ForegroundColor White
Write-Host "2. Lancer: .\start-app.ps1" -ForegroundColor White
Write-Host ""

Read-Host "Appuyez sur Entree pour terminer"
