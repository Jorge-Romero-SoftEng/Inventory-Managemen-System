# API Specification

## Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

## Customers
- `GET /api/customers`
- `GET /api/customers/:id`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

## Price lists
- `GET /api/price-lists`
- `POST /api/price-lists`
- `PUT /api/price-lists/:id`

## Pricing
- `GET /api/products/:id/prices`
- `PUT /api/products/:id/prices`

## Stock
- `GET /api/stock`
- `GET /api/stock/:productId`
- `POST /api/stock/adjust`
- `POST /api/stock/move`

## Sales
- `GET /api/sales`
- `GET /api/sales/:id`
- `POST /api/sales`
- `POST /api/sales/:id/cancel`

## Payments
- `POST /api/payments`
- `GET /api/payments/:saleId`

## Reports
- `GET /api/reports/daily-sales`
- `GET /api/reports/low-stock`
- `GET /api/reports/balances`