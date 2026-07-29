#!/bin/sh
set -e

RELEASE_FOLDER="release"
DIST_FOLDER="dist"

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

echo "saving app.tar"
docker save -o release/app.tar inventory-management-system-app:latest
echo "saving postgres.tar"
docker save -o release/postgres.tar postgres:16-alpine
echo "copying install file inside release"
cp install.sh release/

echo "copying docker-compose.yml and .env files inside release folder"
cp ../docker-compose.yml ../.env release/

echo "generating .tar.gz file inside dist folder"
tar -czf dist/release.tar.gz -C release .