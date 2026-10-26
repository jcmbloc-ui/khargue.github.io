# KHARGUE

## Démarrer le site avec le backend

Node.js 18 ou supérieur est requis.

```powershell
Copy-Item .env.example .env
npm start
```

Ouvrir ensuite http://localhost:3000.

## Paiement

Par défaut, `PAYMENT_PROVIDER=mock` crée une commande locale pour tester le flux sans mouvement d'argent.

Pour relier un prestataire réel, renseigner dans `.env` :

- `PAYMENT_PROVIDER` : nom du prestataire
- `PAYMENT_API_URL` : endpoint de création de paiement
- `PAYMENT_API_KEY` : clé secrète, jamais dans le navigateur
- `PAYMENT_WEBHOOK_SECRET` : secret de signature des webhooks

Le backend expose :

- `POST /api/payments/create`
- `GET /api/payments/:id`
- `POST /api/payments/webhook`
- `GET /api/health`

L'adaptateur envoie au prestataire le montant, la devise, la référence KHARGUE et l'URL de retour. Chaque prestataire peut nécessiter une adaptation de la réponse dans `createProviderPayment`, car les noms de champs et les signatures diffèrent entre Orange Money, MTN MoMo, Stripe ou un agrégateur local.
