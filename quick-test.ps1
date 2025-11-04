# Script de test rapide - Utilise SQLite (pas besoin de PostgreSQL/Redis)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST RAPIDE - MODE SQLite            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Ce mode utilise SQLite pour tester rapidement" -ForegroundColor Yellow
Write-Host "[INFO] Pour la production, utilisez PostgreSQL + Redis" -ForegroundColor Yellow
Write-Host ""

# Sauvegarder les fichiers originaux
Write-Host "1. Sauvegarde des fichiers..." -ForegroundColor Cyan

if (Test-Path "prisma\schema.prisma") {
    Copy-Item "prisma\schema.prisma" "prisma\schema.prisma.backup" -Force
    Write-Host "[OK] Schema Prisma sauvegarde" -ForegroundColor Green
}

if (Test-Path ".env") {
    Copy-Item ".env" ".env.backup" -Force
    Write-Host "[OK] Fichier .env sauvegarde" -ForegroundColor Green
}

Write-Host ""

# Modifier le schema pour SQLite
Write-Host "2. Configuration pour SQLite..." -ForegroundColor Cyan

$schemaContent = Get-Content "prisma\schema.prisma" -Raw
$schemaContent = $schemaContent -replace 'provider = "postgresql"', 'provider = "sqlite"'
$schemaContent = $schemaContent -replace '@default\(uuid\(\)\)', '@default(cuid())'
$schemaContent = $schemaContent -replace 'Bytes', 'String'
Set-Content -Path "prisma\schema.prisma" -Value $schemaContent -Force

Write-Host "[OK] Schema configure pour SQLite" -ForegroundColor Green

# Créer un .env pour SQLite
$envContent = @"
# Database SQLite (test rapide)
DATABASE_URL="file:./dev.db"

# Redis mock
REDIS_URL="redis://localhost:6379"

# Auth & Security
SESSION_SECRET="test-session-secret-min-32-characters-long-dev"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# IMAP (optionnel)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="test@example.com"
IMAP_PASS="test-password"
REPLY_DOMAIN="example.com"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Seed
SEED_SES_USERNAME="demo-ses"
SEED_SES_PASSWORD="demo-password"
SEED_TITAN_USERNAME="demo-titan"
SEED_TITAN_PASSWORD="demo-password"
"@

Set-Content -Path ".env" -Value $envContent -Force
Write-Host "[OK] Fichier .env configure" -ForegroundColor Green

Write-Host ""

# Générer le client Prisma
Write-Host "3. Generation du client Prisma..." -ForegroundColor Cyan
npx prisma generate
if ($?) {
    Write-Host "[OK] Client Prisma genere" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] Erreur generation Prisma" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Initialiser la base de données
Write-Host "4. Initialisation de la base de donnees SQLite..." -ForegroundColor Cyan
npx prisma db push --force-reset
if ($?) {
    Write-Host "[OK] Base de donnees creee" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] Erreur creation base" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Charger les données de test
Write-Host "5. Chargement des donnees de test..." -ForegroundColor Cyan
npm run db:seed
if ($?) {
    Write-Host "[OK] Donnees chargees" -ForegroundColor Green
}
else {
    Write-Host "[ATTENTION] Erreur chargement donnees (peut etre ignore)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEMARRAGE DE L'APPLICATION           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] L'application va demarrer en mode web uniquement" -ForegroundColor Yellow
Write-Host "[INFO] Les workers ne fonctionneront pas sans Redis" -ForegroundColor Yellow
Write-Host ""
Write-Host "Acces:" -ForegroundColor Green
Write-Host "  URL: http://localhost:3000" -ForegroundColor White
Write-Host "  Login: admin@acme.com" -ForegroundColor White
Write-Host "  Pass: Pass456@" -ForegroundColor White
Write-Host ""

Write-Host "Demarrage dans 3 secondes..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

npm run dev
