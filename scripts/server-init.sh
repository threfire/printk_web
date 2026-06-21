#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/printk}"
REPO_URL="${REPO_URL:-git@github.com:threfire/printk_web.git}"
BRANCH="${BRANCH:-master}"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  cp .env.server.example .env
  echo "已生成 .env，请先编辑配置后再重新执行本脚本。"
  exit 0
fi

sudo docker compose up -d --build
sudo docker compose ps

