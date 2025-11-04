# Script de preparation et push pour deploiement Render

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PREPARATION DEPLOIEMENT RENDER       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que git est initialise
if (-not (Test-Path ".git")) {
    Write-Host "[INFO] Initialisation de Git..." -ForegroundColor Yellow
    git init
    Write-Host "[OK] Git initialise" -ForegroundColor Green
}
else {
    Write-Host "[OK] Git deja initialise" -ForegroundColor Green
}

Write-Host ""

# Verifier les changements
Write-Host "Verification des fichiers modifies..." -ForegroundColor Yellow
git status --short

Write-Host ""

# Demander confirmation
$confirm = Read-Host "Voulez-vous committer et pusher ces changements? (O/n)"

if ($confirm -eq "n") {
    Write-Host "Operation annulee" -ForegroundColor Yellow
    exit 0
}

# Ajouter tous les fichiers
Write-Host ""
Write-Host "Ajout des fichiers..." -ForegroundColor Yellow
git add .

if ($?) {
    Write-Host "[OK] Fichiers ajoutes" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] Erreur lors de l'ajout" -ForegroundColor Red
    exit 1
}

# Commit
Write-Host ""
$commitMessage = Read-Host "Message de commit (ou Enter pour message par defaut)"

if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Deploy: Application Email Software ready for production"
}

git commit -m $commitMessage

if ($?) {
    Write-Host "[OK] Commit cree" -ForegroundColor Green
}
else {
    Write-Host "[ERREUR] Erreur lors du commit" -ForegroundColor Red
    exit 1
}

# Verifier si remote existe
$remotes = git remote

if ($remotes -notcontains "origin") {
    Write-Host ""
    Write-Host "[INFO] Aucun remote configure" -ForegroundColor Yellow
    Write-Host "Exemple d'URL: https://github.com/USERNAME/REPO.git" -ForegroundColor Gray
    $remoteUrl = Read-Host "Entrez l'URL de votre repo GitHub"
    
    if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
        Write-Host "[ERREUR] URL requise" -ForegroundColor Red
        exit 1
    }
    
    git remote add origin $remoteUrl
    
    if ($?) {
        Write-Host "[OK] Remote ajoute" -ForegroundColor Green
    }
    else {
        Write-Host "[ERREUR] Erreur lors de l'ajout du remote" -ForegroundColor Red
        exit 1
    }
}

# Verifier la branche
$currentBranch = git branch --show-current

if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    Write-Host ""
    Write-Host "[INFO] Creation de la branche main..." -ForegroundColor Yellow
    git branch -M main
    $currentBranch = "main"
}

Write-Host ""
Write-Host "Push vers GitHub (branche: $currentBranch)..." -ForegroundColor Yellow

git push -u origin $currentBranch

if ($?) {
    Write-Host "[OK] Code pushe sur GitHub avec succes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  PROCHAINES ETAPES                    " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Aller sur https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Cliquer 'New +' -> 'Blueprint'" -ForegroundColor White
    Write-Host "3. Selectionner votre repo GitHub" -ForegroundColor White
    Write-Host "4. Cliquer 'Apply'" -ForegroundColor White
    Write-Host ""
    Write-Host "Render va automatiquement:" -ForegroundColor Yellow
    Write-Host "  - Creer la base de donnees PostgreSQL" -ForegroundColor Gray
    Write-Host "  - Creer Redis" -ForegroundColor Gray
    Write-Host "  - Deployer le service Web" -ForegroundColor Gray
    Write-Host "  - Deployer les Workers" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Consultez: DEPLOIEMENT_RENDER_GUIDE.md pour plus de details" -ForegroundColor Cyan
}
else {
    Write-Host "[ERREUR] Erreur lors du push" -ForegroundColor Red
    Write-Host ""
    Write-Host "Causes possibles:" -ForegroundColor Yellow
    Write-Host "  - URL du remote incorrecte" -ForegroundColor Gray
    Write-Host "  - Authentification requise" -ForegroundColor Gray
    Write-Host "  - Repo n'existe pas sur GitHub" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verifier avec: git remote -v" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Read-Host "Appuyez sur Entree pour terminer"
