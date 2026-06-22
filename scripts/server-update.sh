#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/printk}"
BRANCH="${BRANCH:-master}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "未找到 Git 仓库，请先执行 scripts/server-init.sh"
  exit 1
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

mkdir -p storage/backups
if sudo docker ps -a --format '{{.Names}}' | grep -qx 'printk-backend'; then
  RECOVERY_DIR="storage/backups/container-storage-$(date +%Y%m%d-%H%M%S)"
  if sudo docker exec printk-backend sh -c 'test -d /storage && find /storage -mindepth 1 -maxdepth 1 | read _'; then
    mkdir -p "$RECOVERY_DIR"
    sudo docker cp printk-backend:/storage/. "$RECOVERY_DIR/" || true
    if [ ! -f storage/system.db ] && [ -f "$RECOVERY_DIR/system.db" ]; then
      cp "$RECOVERY_DIR/system.db" storage/system.db
      echo "已从旧容器 /storage 恢复数据库到 storage/system.db"
    fi
  fi
fi

sudo docker compose up -d --build
sudo docker compose ps
