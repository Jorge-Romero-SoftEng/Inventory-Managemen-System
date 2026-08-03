# --- Stage 1: Dependencies ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Copy Prisma schema BEFORE running npm ci so postinstall can find it
COPY prisma ./prisma/
RUN npm ci

# --- Stage 2: Builder ---
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public env vars are inlined into client bundles at build time
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ARG NEXT_PUBLIC_LOCALE
ENV NEXT_PUBLIC_LOCALE=${NEXT_PUBLIC_LOCALE}
# Builds the standalone bundle inside .next/standalone
RUN npm run prebuild
RUN npm run build

# --- Stage 2.5: Dedicated Migrator ---
FROM node:24-alpine AS migrator
WORKDIR /app
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules

# COPY DIRECTLY FROM HOST (Guarantees migrations/ is fresh)
COPY ./prisma ./prisma

# Generate client during image BUILD
RUN npx prisma generate

# Execute migrations and seeding at runtime
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed"]

# --- Stage 3: Tiny Production Runner ---
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy ONLY the optimized standalone bundle (includes tiny traced node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Standalone mode runs via node server.js directly instead of "npm start"
CMD ["node", "server.js"]