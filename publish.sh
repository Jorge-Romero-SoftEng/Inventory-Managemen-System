#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---------------------------------------------------------
# chmod +x publish.sh

if [ -f .env ]; then
    export $(grep -E '^(DOCKERHUB_USER|VERSION|APP_LOCAL_IMAGE)=' .env)
fi

APP_REMOTE="${DOCKERHUB_USER}/app:${VERSION}"

# --- Login -------------------------------------------------------------
echo "Logging in to Docker Hub..."
docker login

# --- Publish app ---------------------------------------------------------
echo "Publishing app..."
docker tag $APP_LOCAL_IMAGE $APP_REMOTE
docker push $APP_REMOTE

echo "All images published successfully:"
echo "  ${APP_REMOTE}"