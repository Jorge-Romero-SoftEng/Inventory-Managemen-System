Mercado Pago QR Code Integration Plan
Prerequisites — Setting Up Your Mercado Pago Account
Before coding, you need to:
1. Create a Mercado Pago account at https://www.mercadopago.com.ar (or your country's domain)
2. Go to Your Integrations (https://www.mercadopago.com.ar/developers/panel/app) and create an application:
- Select Online payments as the payment type
- Select Checkout Transparente as the solution
- Select Orders API as the API type
3. Get your Access Token from the left menu under Testing > Test credentials (starts with APP_USR)
4. Configure your store and POS in the Mercado Pago dashboard (required for QR Code integration)
5. Configure webhooks in Your Integrations: subscribe to the orders topic and set the notification URL to your webhook endpoint
6. Activate production credentials when ready (under Production credentials section, fill in your business info)
Environment Variables
Add these to your .env file (do NOT commit them):
# Mercado Pago - Get from Your Integrations > Testing > Test credentials
MP_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Mercado Pago Store/POS IDs - Created in Mercado Pago dashboard
# Go to Mercado Pago app > Your business > Stores > Create store
MP_STORE_ID=YOUR_STORE_ID

# Go to your store > Points of sale > Create POS
MP_POS_ID=YOUR_POS_ID

# App environment for webhook URL resolution
# Options: "development" or "production"
NEXT_PUBLIC_MP_ENVIRONMENT=development
For production, add the same variables to Vercel's environment variables with your production Access Token.
Implementation Plan
1. Install Dependencies
npm install mercadopago qrcode.react
- mercadopago v3.2.0 — Official Node.js SDK
- qrcode.react — Renders the EMVCo QR string as a scannable QR code image
2. Prisma Schema Changes (prisma/schema.prisma)
Add two new fields to the Sale model to track Mercado Pago orders:
model Sale {
  // ... existing fields ...
  mpOrderId    String?  @map("mp_order_id") @db.VarChar(100)
  mpQrData     String?  @map("mp_qr_data") @db.Text
  expiresAt    DateTime? @map("expires_at")
}
- mpOrderId — The Mercado Pago order ID (e.g. ORD000011112222...)
- mpQrData — The EMVCo QR data string returned by MP API
- expiresAt — When the QR code expires (default: 15 minutes from creation)
Then run: npm run db:push (or npm run db:migrate)
3. Mercado Pago Client Library (src/lib/mercadopago.ts)
Create a new file that initializes the MP SDK client as a singleton:
import { MercadoPagoConfig } from "mercadopago";

export function getMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
    options: { timeout: 5000 },
  });
}
4. New API Route — Create QR Order (src/app/api/payments/create-qr/route.ts)
This endpoint:
1. Receives sale data (items, total, customer info)
2. Creates a sale with status: "pending" and reserves stock immediately
3. Calls Mercado Pago POST /v1/orders with config.qr.mode: "dynamic"
4. Returns the qr_data string and order_id to the frontend
5. Stores mpOrderId, mpQrData, and expiresAt on the sale
5. New API Route — MP Webhook (src/app/api/payments/webhook/route.ts)
This endpoint:
1. Receives POST notifications from Mercado Pago when order status changes
2. Validates the webhook signature (HMAC-SHA256 with your secret key)
3. Extracts order_id from the notification
4. Calls GET /v1/orders/{order_id} to get full order details
5. If status is processed / accredited → updates sale to "completed", creates Payment record
6. If status is canceled / expired / refunded → updates sale to "cancelled", restores stock
6. PaymentDialog Changes (src/components/pos/PaymentDialog.tsx)
Add a new "QR Code" payment method (teal/cyan color):
{ id: "qr", label: "QR Code", color: "bg-teal-600 hover:bg-teal-500" }
When QR is selected and user clicks "Confirm Payment":
- Instead of closing the dialog, show a QR code rendering state
- Call POST /api/payments/create-qr with cart data
- Display the QR code using QRCodeSVG from qrcode.react with the returned qr_data
- Show a countdown timer (15 min expiration)
- Show status indicators: "Waiting for payment..." / "Payment received!" / "Expired"
7. POS Page Changes (src/app/pos/page.tsx)
Update handlePayment to handle the qr method differently:
- For qr: create the pending sale, get QR data, show QR in dialog, start polling
- Poll GET /api/sales/{id} every 5 seconds to check status
- When status changes to "completed", clear cart and close dialog
- When status changes to "cancelled" / "expired", show error and offer retry
8. Sales History Updates (src/app/sales/page.tsx)
- Show pending status with a yellow badge
- Show mpOrderId in the detail modal if present
- Allow cancellation of pending QR sales (which will call the cancel endpoint)
9. Cancel Route Updates (src/app/api/sales/[id]/cancel/route.ts)
- If the sale has an mpOrderId and status is pending, call POST /v1/orders/{order_id}/cancel to cancel the MP order too
- Then proceed with stock restoration as usual
10. New Utility (src/lib/utils.ts)
Add a formatDate utility for consistent date formatting across the app.
Payment Flow Summary
User clicks "QR Code" in PaymentDialog
  → User clicks "Confirm"
  → POST /api/payments/create-qr (creates pending sale + reserves stock + creates MP order)
  → QR code displayed on screen (15 min countdown)
  → Customer scans QR with Mercado Pago app
  → Mercado Pago sends webhook to POST /api/payments/webhook
  → Webhook updates sale to "completed", creates Payment record
  → Frontend polls sale status → detects "completed" → clears cart, shows success
Files to Create
File
src/lib/mercadopago.ts
src/app/api/payments/create-qr/route.ts
src/app/api/payments/webhook/route.ts
Files to Modify
File
prisma/schema.prisma
src/components/pos/PaymentDialog.tsx
src/app/pos/page.tsx
src/app/sales/page.tsx
src/app/api/sales/route.ts
src/app/api/sales/[id]/cancel/route.ts
src/types/index.ts
Want me to proceed with this plan?