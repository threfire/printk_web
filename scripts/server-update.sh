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
sudo docker compose up -d --build
sudo docker compose ps

