#!/bin/sh
set -e

docker save -o app.tar inventory-management-system-app:latest
docker save -o postgres.tar postgres:16-alpine

mkdir -p release
cd ..
cp docker-compose.yml .env app.tar postgres.tar install.sh release/
tar -czf release.tar.gz -C release .