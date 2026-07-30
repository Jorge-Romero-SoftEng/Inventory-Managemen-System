#!/bin/sh
set -e
set -x

APP_IMAGE=inventory-management-system-app:latest
POSTGRES_IMAGE=postgres:16-alpine
MIGRATIONS_IMAGES=inventory-management-system-migration:latest

echo "compose down..."
docker compose down

echo "Buildx history..."
docker buildx history rm --all

echo "Building pruning..."
docker builder prune --all

echo "System pruning..."
docker system prune --all --volumes

echo "Building images..."
docker build -t $APP_IMAGE .
docker build -t $POSTGRES_IMAGE . 
docker build -t $MIGRATIONS_IMAGES .

EXPORT_FOLDER="export"
RELEASE_FOLDER="$EXPORT_FOLDER/release"
DIST_FOLDER="$EXPORT_FOLDER/dist"
PRISMA_FOLDER="$RELEASE_FOLDER/prisma"

# Remove release folder if it exists
if [ -d "$RELEASE_FOLDER" ]; then
    rm -rf "$RELEASE_FOLDER"
    echo "Removed existing folder: $RELEASE_FOLDER"
fi

# Rename existing release archive if it exists
if [ -f "$DIST_FOLDER/release.tar.gz" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mv "$DIST_FOLDER/release.tar.gz" \
       "$DIST_FOLDER/release_${TIMESTAMP}.tar.gz"
    echo "Existing archive renamed to release_${TIMESTAMP}.tar.gz"
fi

mkdir -p "$RELEASE_FOLDER"
echo "Created new directory: $RELEASE_FOLDER"

mkdir -p "$DIST_FOLDER"
echo "Created new directory: $DIST_FOLDER"

mkdir -p "$PRISMA_FOLDER"
echo "Created new directory: $PRISMA_FOLDER"

echo "saving app.tar"
docker save -o $RELEASE_FOLDER/app.tar $APP_IMAGE

echo "saving postgres.tar"
docker save -o $RELEASE_FOLDER/postgres.tar $POSTGRES_IMAGE

echo "saving migrations.tar"
docker save -o $RELEASE_FOLDER/migrations.tar $MIGRATIONS_IMAGES


echo "copying install file inside release"
cp export/install.sh $RELEASE_FOLDER

echo "copying docker-compose.yml and .env files inside $RELEASE_FOLDER folder"
cp docker-compose.yml .env Dockerfile package*.json $RELEASE_FOLDER

echo "copying prisma folder inside $RELEASE_FOLDER folder"
cp -r prisma/. "$PRISMA_FOLDER/"


echo "generating .tar.gz file inside dist folder"
tar -czf $DIST_FOLDER/release.tar.gz -C $RELEASE_FOLDER .

echo "Done!"