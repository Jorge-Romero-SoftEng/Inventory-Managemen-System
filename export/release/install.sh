#!/bin/sh
set -e

echo "Loading images..."
docker load -i postgres.tar
docker load -i app.tar

echo "Starting services..."
docker compose up -d

echo "Done."