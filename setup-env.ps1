# Script de configuration de l'environnement
$envContent = @"
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/emailapp"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth & Security
SESSION_SECRET="dev-session-secret-min-32-characters-long"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# IMAP (for inbound)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="test@example.com"
IMAP_PASS="test-password"
REPLY_DOMAIN="example.com"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ Fichier .env créé avec succès"
