# Script d'application des corrections critiques
# Installe lru-cache pour fix memory leak

Write-Host "Installation de lru-cache..." -ForegroundColor Cyan
npm install lru-cache

Write-Host "Corrections appliquees avec succes!" -ForegroundColor Green
Write-Host ""
Write-Host "PROCHAINES ETAPES:" -ForegroundColor Yellow
Write-Host "1. Executer: .\fix-app.ps1" -ForegroundColor White
Write-Host "2. Tester l'application" -ForegroundColor White
