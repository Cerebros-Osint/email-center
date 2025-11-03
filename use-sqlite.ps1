# Script pour utiliser SQLite au lieu de PostgreSQL
Write-Host "🔄 Basculement vers SQLite..." -ForegroundColor Yellow

# Backup actuel
Copy-Item ".env" ".env.postgres.backup" -Force
Copy-Item "prisma\schema.prisma" "prisma\schema.postgres.backup" -Force

# Utiliser SQLite
Copy-Item ".env.sqlite" ".env" -Force
Copy-Item "prisma\schema.sqlite.prisma" "prisma\schema.prisma" -Force

Write-Host "✅ Configuration SQLite activée" -ForegroundColor Green
Write-Host ""
Write-Host "Exécutez maintenant:" -ForegroundColor Cyan
Write-Host "  npx prisma generate" -ForegroundColor White
Write-Host "  npx prisma db push" -ForegroundColor White
Write-Host "  npm run db:seed" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
