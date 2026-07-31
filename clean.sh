#!/bin/sh
set -e
set -x

echo "compose down..."
docker compose down

echo "Buildx history..."
docker buildx history rm --all

echo "Building pruning..."
docker builder prune --all

echo "System pruning..."
docker system prune --all --volumes