What was done
New files created:
File
src/lib/mercadopago.ts
src/app/api/payments/create-qr/route.ts
src/app/api/payments/webhook/route.ts
Files modified:
File	Changes
prisma/schema.prisma	Added mpOrderId, mpQrData, expiresAt to Sale model
src/types/index.ts	Added MP fields to Sale interface
src/components/pos/PaymentDialog.tsx	Added QR Code method + QR rendering with polling + success/expired states
src/app/pos/page.tsx	Added handleGenerateQR + passes callback to PaymentDialog
src/app/sales/page.tsx	Shows pending badge + MP order ID + cancel pending sales
src/app/api/sales/[id]/cancel/route.ts	Cancels MP order before local cancellation
.npmrc	Fixed min-release-age format
What you need to do
1. Install dependencies
npm install
(This installs mercadopago@3.2.1 and qrcode.react which are already in package.json)
2. Add environment variables to .env
# Mercado Pago - Get from Your Integrations > Testing > Test credentials
MP_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Created in Mercado Pago dashboard > Your business > Stores > POS
MP_STORE_ID=YOUR_STORE_ID
MP_POS_ID=YOUR_POS_ID

# App environment for webhook URL resolution
NEXT_PUBLIC_MP_ENVIRONMENT=development
3. Push schema changes
npm run db:push
4. Configure webhook in Mercado Pago
- Go to Your Integrations > your app > Webhooks
- Subscribe to the orders topic
- Set notification URL to:
- Dev: https://your-ngrok-url/api/payments/webhook
- Production: https://your-domain.vercel.app/api/payments/webhook
5. Run lint/typecheck
npm run lint && npm run typecheck