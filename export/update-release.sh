docker compose down
docker load -i app-new.tar
docker compose up -d
docker image prune -a