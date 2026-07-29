#!/bin/sh
set -e

echo "Running Prisma migrations..."
./node_modules/.bin/prisma db push --skip-generate

echo "Seeding database..."
./node_modules/.bin/tsx prisma/seed.ts || echo "Seed skipped (may already exist)"

echo "Starting application..."
exec node server.js
