# 🚀 Guide de Déploiement Render

## Configuration Automatique (recommandée)

1. **Connecter GitHub à Render**
   - Allez sur https://dashboard.render.com
   - Cliquez "New +" → "Blueprint"
   - Sélectionnez votre repo `Cerebros-Osint/email-center`
   - Render détectera automatiquement le `render.yaml`

2. **Services créés automatiquement :**
   - ✅ Web Service (Next.js app)
   - ✅ Worker Service (BullMQ)
   - ✅ PostgreSQL Database
   - ✅ Redis Database

## Variables d'environnement à configurer manuellement

Après création des services, allez dans chaque service et ajoutez ces variables :

### Pour les 2 services (Web + Worker) :
```
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_USER=user@financial-apra.com
IMAP_PASS=Alpha9779@
REPLY_DOMAIN=financial-apra.com
SEED_TITAN_USERNAME=username@email-server.org
SEED_TITAN_PASSWORD=Alpha9779@
```

### Pour le Web Service uniquement :
```
NEXT_PUBLIC_APP_URL=https://votre-app.render.com
```

## Accès à l'application

- **URL** : Fournie par Render après déploiement
- **Login** : `admin@acme.com`
- **Password** : `password123`

## Vérification du déploiement

1. Vérifiez `/api/health` pour le status
2. Vérifiez `/api/metrics` pour les métriques
3. Testez l'envoi d'email dans l'interface

## Support

Si vous avez des problèmes :
- Consultez les logs Render
- Vérifiez les variables d'environnement
- Testez localement d'abord avec `npm run dev`
