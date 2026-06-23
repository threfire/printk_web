#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
BRANCH="${BRANCH:-}"
BACKUP_ROOT="${BACKUP_ROOT:-storage/backups}"
LOG_TAIL="${LOG_TAIL:-100}"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "错误：$*" >&2
  exit 1
}

validate_positive_integer() {
  local name="$1"
  local value="$2"

  case "$value" in
    ''|*[!0-9]*)
      fail "$name 必须是正整数。"
      ;;
  esac

  if [ "$value" -lt 1 ]; then
    fail "$name 必须大于等于 1。"
  fi
}

validate_compose_storage_mount() {
  [ -f "$COMPOSE_FILE" ] || fail "未找到 docker-compose.yml：$COMPOSE_FILE"

  if ! awk '
    {
      line = $0
      sub(/[[:space:]]*#.*/, "", line)
      gsub(/[[:space:]]/, "", line)
    }
    line == "-./storage:/app/storage" || line == "-\"./storage:/app/storage\"" {
      found = 1
    }
    END {
      exit found ? 0 : 1
    }
  ' "$COMPOSE_FILE"; then
    fail "docker-compose.yml 必须包含 ./storage:/app/storage 挂载。"
  fi

  echo "已校验 storage 挂载：./storage:/app/storage"
}

select_docker_command() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
    DOCKER_CMD=(sudo docker)
    return
  fi

  fail "docker compose 不可用。"
}

backup_storage() {
  local backup_dir="$1"

  mkdir -p storage "$backup_dir"
  tar -C storage --exclude='./backups' -cf - . | tar -C "$backup_dir" -xf -
  echo "已生成 storage 备份：$backup_dir"
}

pull_latest_code() {
  [ -d .git ] || fail "未找到 Git 仓库：$APP_DIR"

  if [ -z "$BRANCH" ]; then
    BRANCH="$(git branch --show-current)"
  fi

  [ -n "$BRANCH" ] || fail "BRANCH 为空；detached HEAD 状态下需要显式设置 BRANCH。"

  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
}

validate_positive_integer LOG_TAIL "$LOG_TAIL"

cd "$APP_DIR"
validate_compose_storage_mount

BACKUP_DIR="$BACKUP_ROOT/storage-$TIMESTAMP"
backup_storage "$BACKUP_DIR"

pull_latest_code
validate_compose_storage_mount

select_docker_command
"${DOCKER_CMD[@]}" compose up -d --build

echo
echo "容器状态："
"${DOCKER_CMD[@]}" compose ps

echo
echo "最近日志："
"${DOCKER_CMD[@]}" compose logs --tail "$LOG_TAIL"
