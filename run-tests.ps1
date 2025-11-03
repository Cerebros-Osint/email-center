# Script pour exécuter les tests unitaires
Write-Host "🧪 Exécution des tests unitaires..." -ForegroundColor Cyan
Write-Host ""

# Bypass execution policy
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Compter les fichiers de test
$testFiles = Get-ChildItem -Path "tests\unit\*.test.ts" -Recurse
$totalTests = $testFiles.Count

Write-Host "📊 Tests trouvés: $totalTests fichiers" -ForegroundColor Green
Write-Host ""

# Liste des tests
Write-Host "Tests disponibles:" -ForegroundColor Yellow
foreach ($file in $testFiles) {
    Write-Host "  ✅ $($file.Name)" -ForegroundColor White
}
Write-Host ""

# Exécuter les tests
Write-Host "▶️  Lancement des tests..." -ForegroundColor Cyan
Write-Host ""

try {
    npx vitest run --reporter=verbose
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ TOUS LES TESTS SONT PASSÉS" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Certains tests ont échoué" -ForegroundColor Red
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors de l'exécution des tests" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Write-Host "📊 Rapport complet disponible ci-dessus" -ForegroundColor Cyan
Write-Host ""
