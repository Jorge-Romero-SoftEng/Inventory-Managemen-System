# AGENTS.md

## Project Overview

**Wholesale POS** — A wholesale point-of-sale and inventory management system for a store selling flour, sugar, and yerba mate to small retail stores. Features a dark, desktop-first POS terminal UI optimized for fast counter sales with barcode scanning, product search, customer-specific pricing via multiple price lists, invoice creation, multiple payment methods (cash, transfer, credit account, partial), and real-time stock tracking.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5.8
- **ORM:** Prisma 6.9 with PostgreSQL 16
- **Styling:** Tailwind CSS 3.4 with CSS variables (dark mode only), shadcn/ui components (no Radix)
- **Auth:** jose (JWT) + bcryptjs, httpOnly cookies
- **Validation:** Zod
- **Icons:** lucide-react
- **Deployment:** Docker (multi-stage) + Vercel

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build (runs audit-ci as prebuild)
npm run start        # Start production server
npm run lint         # Run ESLint (next lint)
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run db:push      # Push Prisma schema to database
npm run db:migrate   # Run Prisma dev migration
npm run db:seed      # Seed database (tsx prisma/seed.ts)
npm run db:studio    # Open Prisma Studio GUI
docker compose up --build  # Full Docker stack (PostgreSQL + App)
```

**Always run after changes:** `npm run lint && npm run typecheck`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # API route handlers (18 endpoints)
│   │   ├── auth/           # login, register
│   │   ├── products/       # CRUD + prices
│   │   ├── customers/      # CRUD
│   │   ├── price-lists/    # CRUD
│   │   ├── stock/          # query + adjust + move
│   │   ├── sales/          # CRUD + cancel
│   │   ├── payments/       # create + list by sale
│   │   └── reports/        # daily-sales, low-stock, balances
│   ├── login/page.tsx      # Login form
│   ├── pos/page.tsx        # Main POS terminal
│   ├── products/page.tsx   # Product CRUD
│   ├── customers/page.tsx  # Customer CRUD
│   ├── sales/page.tsx      # Sales history + invoice detail
│   └── reports/page.tsx    # Tabbed reports
├── components/
│   ├── layout/             # Sidebar, TopBar
│   ├── pos/                # ProductSearch, SaleGrid, SaleSummary, PaymentDialog
│   └── ui/                 # Badge, Button, Card, Dialog, Input, Select, Table
├── lib/
│   ├── auth.ts             # JWT sign/verify, getSession
│   ├── db.ts               # Singleton PrismaClient
│   └── utils.ts            # cn(), formatCurrency (ARS), formatNumber
├── types/
│   └── index.ts            # TypeScript interfaces for all entities
└── middleware.ts            # JWT auth guard (protects all routes except /login, /api/auth)
```

## Path Aliases

- `@/*` → `./src/*` (use in all imports: `@/components/...`, `@/lib/...`, `@/types/...`)

## Key Conventions

### Styling
- **Dark mode only** — `<html className="dark">` is hardcoded
- **shadcn/ui pattern** — CSS variables for theme colors (HSL-based) in `globals.css`
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- CVA (class-variance-authority) for component variants

### Components
- All pages and interactive components use `"use client"` directive
- Pages follow layout: `<div className="flex h-screen overflow-hidden"><Sidebar /><div className="flex flex-col flex-1"><TopBar />...content...</div></div>`
- Create/edit via **dialog pattern** (no separate pages)
- Debounced search: 200-300ms `setTimeout` in `useEffect` cleanup
- Fetch-based API calls from client components (no server actions, no React Query)
- State managed locally with `useState`/`useCallback` (no global state library)

### API Routes
- Next.js App Router Route Handlers (`route.ts`)
- Return `NextResponse.json()` with consistent error handling
- Route params: `params: Promise<{ id: string }>` (Next.js 15 async params)
- Search params from `new URL(request.url).searchParams`

### Database
- Prisma schema uses `@map()`/`@@map()` for snake_case PostgreSQL mapping
- Singleton PrismaClient pattern (global cache for dev hot-reload)
- Transactions for: sale creation, sale cancellation, stock adjustment, price upserts

### Authentication
- JWT via `jose` library, HS256, 24h expiration
- Tokens in httpOnly cookies named `token`
- Middleware protects all routes except `/login` and `/api/auth/*`
- Password hashing: bcryptjs (10 rounds)

## Prisma Models

| Model | Purpose |
|---|---|
| User | System users/admins |
| Category | Product categories |
| Product | Product catalog (barcode, name, cost) |
| Customer | Wholesale customers with credit tracking |
| PriceList | Named pricing tiers |
| ProductPrice | Price per product per price list |
| Stock | Per-product warehouse inventory |
| Sale | Sales transactions |
| SaleItem | Line items in a sale |
| Payment | Payment records linked to sales |
| StockMovement | Audit trail of stock changes |

## Currency & Locale

- Currency: Argentine Peso (ARS)
- Locale: `es-AR`
- Use `formatCurrency(amount)` from `@/lib/utils` for display
- Use `formatNumber(n)` for number formatting

## Deployment

- **Docker:** Multi-stage Dockerfile (deps → builder → runner), Alpine-based, standalone output
- **Vercel:** Custom buildCommand runs `prisma generate && prisma migrate deploy && next build`
- **Seed data:** ADMIN_USERNAME / ADMIN_PASSWORD, 3 categories, 14 products, 5 customers, 3 price lists
