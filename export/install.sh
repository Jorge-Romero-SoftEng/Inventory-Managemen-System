#!/bin/sh
set -e
echo "Compose Down..."
docker compose down


echo "Loading images..."
docker load -i postgres.tar
docker load -i app.tar
docker load -i migrations.tar

echo "Buiding and Running containers..."
docker compose up -d

echo "Images were built and containers are running successfully!"

echo "delete old versions"
docker image prune -a

echo "Done."