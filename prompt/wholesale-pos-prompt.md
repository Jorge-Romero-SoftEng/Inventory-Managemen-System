# Wholesale POS and Inventory System Prompt

Build a wholesale POS and inventory management system for a store that sells flour, sugar, and yerba mate to small retail stores. The app should be fast, reliable, and optimized for counter sales, with a dark, desktop-style interface similar to a point-of-sale terminal. The workflow must support barcode/code entry, product search, customer selection, price lists, invoice creation, payments, and stock updates in a single screen.

## Primary goals
- Speed at checkout.
- Accurate inventory tracking.
- Customer-specific pricing.
- Support for wholesale pack sizes and unit conversions.
- Clean invoice and payment workflow.
- Future-ready architecture for scaling to more products and branches.

## Functional requirements
- Product catalog with barcode, SKU, name, category, unit, pack size, cost, and active status.
- Customer management with tax ID, address, phone, credit limit, and account balance.
- Multiple price lists, including public price and reseller price.
- Sales screen with line items, quantity, discount, tax, subtotal, and total.
- Payment methods: cash, transfer, credit account, partial payment.
- Stock movements for purchases, sales, corrections, and adjustments.
- Reports for daily sales, low stock, outstanding balances, and margins.
- Optional delivery flag for orders sent to customers.

## UI requirements
- Top bar with business name, invoice number, user, and online/offline status.
- Search input for scanning or typing product codes.
- Central grid with sale line items.
- Bottom summary panel with customer, payment, quantities, and totals.
- Mobile-unfriendly is okay; prioritize fast desktop operation.

## Technical requirements
- Frontend: Next.js or React.
- Backend: Node.js with Express or FastAPI.
- Database: PostgreSQL.
- Offline-friendly design with sync support if possible.
- REST API with clean endpoint structure.
- Auth-ready architecture for future login and roles.
- Modular codebase with separate services for products, customers, sales, and inventory.

## Domain notes
- Products are mostly packaged goods.
- Sales are often repeated to the same small stores.
- Price list selection must be simple and visible.
- Partial credit and account tracking are important.
- The system should be easy to extend to more wholesale products later.

## Deliverable expectation
- Production-lean MVP first.
- Then add reports, export, and printing.
- Keep the code clean, modular, and easy to maintain.