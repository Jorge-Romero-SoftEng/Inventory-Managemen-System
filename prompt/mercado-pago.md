Integrate Mercado Pago Dynamic QR Code payments into this workspace. 

I have a mono-repo/split architecture using:
- Frontend: React (Vite/CRA)
- Backend: Node.js (Express)

Please perform the following operations across my workspace files:

1. BACKEND DEPENDENCIES:
   - Check if `mercadopago` and `cors` are in the backend package.json; install them if missing.

2. BACKEND SETUP (Node.js/Express):
   - Locate or create a router file for payments.
   - Initialize the Mercado Pago client using `new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })`.
   - Create a `POST /api/payments/create-qr` endpoint.
   - In the route handler, instantiate `new QRCode(client)` and call `create()` using dummy/placeholder variables for userId, externalStoreId, and externalPosId. Ensure it accepts a dynamic 'amount' from the request body.
   - Create a `POST /api/payments/webhook` endpoint to capture instant payment notifications from Mercado Pago.

3. FRONTEND DEPENDENCIES:
   - Check if `qrcode.react` (or `qrcode`) is installed in the frontend package.json; install it if missing.

4. FRONTEND SETUP (React):
   - Locate or create a checkout/payment component.
   - Implement a fetch request to trigger the backend `/api/payments/create-qr` endpoint.
   - Use the `QRCodeSVG` component from `qrcode.react` to render the raw EMVCo string payload (`qr_data`) returned from the server.
   - Design a clean, minimal UI showing a "Generate QR Code" button, a loading state, and the rendered QR image canvas once ready.

5. SECURE KEYS:
   - Add placeholders for `MP_ACCESS_TOKEN`, `MP_USER_ID`, `MP_STORE_ID`, and `MP_POS_ID` inside the backend `.env` configuration file. Do not commit actual credentials.

Review the existing codebase structure first to ensure import styles, paths, and server architecture match my current code style guidelines. Ask for confirmation before running any destructive terminal commands or terminal installations.
