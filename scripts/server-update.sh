#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/printk}"
BRANCH="${BRANCH:-master}"
BACKUP_ROOT="${BACKUP_ROOT:-storage/backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Git repository not found. Run scripts/server-init.sh first."
  exit 1
fi

case "$KEEP_BACKUPS" in
  ''|*[!0-9]*)
    echo "KEEP_BACKUPS must be a positive integer."
    exit 1
    ;;
esac

if [ "$KEEP_BACKUPS" -lt 1 ]; then
  echo "KEEP_BACKUPS must be at least 1."
  exit 1
fi

cd "$APP_DIR"

mkdir -p storage "$BACKUP_ROOT"

backup_host_storage() {
  if [ -n "$(find storage -mindepth 1 -maxdepth 1 ! -name backups -print -quit)" ]; then
    HOST_BACKUP="$BACKUP_ROOT/host-storage-$TIMESTAMP.tar.gz"
    tar -C storage --exclude='./backups' -czf "$HOST_BACKUP" .
    echo "Host storage backup created: $HOST_BACKUP"
  fi
}

restore_missing_storage_files() {
  RECOVERED_DIR="$1"

  if [ -f "$RECOVERED_DIR/system.db" ] && { [ ! -f storage/system.db ] || [ ! -s storage/system.db ]; }; then
    cp -f "$RECOVERED_DIR/system.db" storage/system.db
    echo "Recovered storage/system.db from $RECOVERED_DIR"
  fi

  for name in archive invoices master site_media temp image2-channel.json; do
    if [ -e "$RECOVERED_DIR/$name" ] && [ ! -e "storage/$name" ]; then
      cp -a "$RECOVERED_DIR/$name" "storage/$name"
      echo "Recovered storage/$name from $RECOVERED_DIR"
    fi
  done
}

backup_container_storage_path() {
  CONTAINER_PATH="$1"
  BACKUP_LABEL="$(printf '%s' "$CONTAINER_PATH" | tr '/ ' '__')"
  RECOVERY_DIR="$BACKUP_ROOT/container-storage-$BACKUP_LABEL-$TIMESTAMP"

  if sudo docker exec printk-backend sh -c "test -d '$CONTAINER_PATH' && find '$CONTAINER_PATH' -mindepth 1 -maxdepth 1 | read _"; then
    mkdir -p "$RECOVERY_DIR"
    sudo docker cp "printk-backend:$CONTAINER_PATH/." "$RECOVERY_DIR/" || true
    echo "Container storage backup created: $RECOVERY_DIR"
    restore_missing_storage_files "$RECOVERY_DIR"
  fi
}

prune_server_backups() {
  mapfile -t OLD_BACKUPS < <(
    find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -printf '%T@ %p\n' |
      sort -rn |
      sed "1,${KEEP_BACKUPS}d" |
      cut -d' ' -f2-
  )

  for OLD_BACKUP in "${OLD_BACKUPS[@]}"; do
    rm -rf -- "$OLD_BACKUP"
    echo "Removed old server backup: $OLD_BACKUP"
  done
}

backup_host_storage

if sudo docker ps -a --format '{{.Names}}' | grep -qx 'printk-backend'; then
  backup_container_storage_path /app/storage
  backup_container_storage_path /storage
fi

prune_server_backups

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

sudo docker compose up -d --build
sudo docker compose ps
