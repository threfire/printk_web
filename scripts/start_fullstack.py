from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
NPM_BIN = "npm.cmd" if os.name == "nt" else "npm"
NODE_BIN = "node.exe" if os.name == "nt" else "node"
LOG_DIR = PROJECT_ROOT / "storage" / "logs"
BACKEND_LOG = LOG_DIR / "backend.log"
FRONTEND_LOG = LOG_DIR / "frontend.log"
PID_FILE = LOG_DIR / "fullstack.pid"
VENV_DIR = PROJECT_ROOT / ".venv-fastapi"
VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"


def run(command: list[str], cwd: Path) -> None:
    result = subprocess.run(command, cwd=cwd, text=True, encoding="utf-8", errors="replace", check=False)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def ensure_backend_runtime() -> Path:
    if not VENV_PYTHON.exists():
        run([sys.executable, "-m", "venv", str(VENV_DIR)], PROJECT_ROOT)
    run([str(VENV_PYTHON), "-m", "pip", "install", "-r", str(BACKEND_DIR / "requirements.txt")], PROJECT_ROOT)
    return VENV_PYTHON


def ensure_frontend_runtime() -> None:
    if not (FRONTEND_DIR / "node_modules").exists():
        run([NPM_BIN, "install"], FRONTEND_DIR)


def wait_url(url: str, timeout_seconds: int = 45) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status < 500:
                    return True
        except (TimeoutError, urllib.error.URLError):
            time.sleep(0.5)
    return False


def stop_previous_processes() -> None:
    if not PID_FILE.exists():
        return
    for line in PID_FILE.read_text(encoding="utf-8").splitlines():
        pid = line.strip()
        if pid:
            subprocess.run(["taskkill", "/PID", pid, "/T", "/F"], check=False, capture_output=True)
    PID_FILE.unlink(missing_ok=True)


def local_lan_ips() -> list[str]:
    ips: set[str] = set()
    try:
        host_name = socket.gethostname()
        for item in socket.getaddrinfo(host_name, None, socket.AF_INET):
            ip = item[4][0]
            if not ip.startswith("127."):
                ips.add(ip)
    except OSError:
        pass
    return sorted(ips)


def main() -> int:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    stop_previous_processes()
    python_path = ensure_backend_runtime()
    ensure_frontend_runtime()

    backend_stdout = BACKEND_LOG.open("w", encoding="utf-8")
    frontend_stdout = FRONTEND_LOG.open("w", encoding="utf-8")
    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS if os.name == "nt" else 0

    backend = subprocess.Popen(
        [str(python_path), "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=backend_stdout,
        stderr=subprocess.STDOUT,
        creationflags=creation_flags,
    )
    frontend_env = {}
    for key, value in os.environ.items():
        if key.lower() == "path":
            frontend_env["Path" if os.name == "nt" else key] = value
        else:
            frontend_env[key] = value
    frontend_env.setdefault("INTERNAL_API_BASE_URL", "http://127.0.0.1:8000")
    frontend_env.setdefault("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000")
    frontend = subprocess.Popen(
        [NODE_BIN, str(FRONTEND_DIR / "node_modules" / "next" / "dist" / "bin" / "next"), "dev", "--hostname", "0.0.0.0", "--port", "3000"],
        cwd=FRONTEND_DIR,
        stdout=frontend_stdout,
        stderr=subprocess.STDOUT,
        env=frontend_env,
        creationflags=creation_flags,
    )
    PID_FILE.write_text(f"{backend.pid}\n{frontend.pid}\n", encoding="utf-8")
    backend_stdout.close()
    frontend_stdout.close()

    if not wait_url("http://127.0.0.1:8000/api/health"):
        print("后端未在 8000 端口就绪，请查看 storage/logs/backend.log")
        return 1
    if not wait_url("http://127.0.0.1:3000"):
        print("前端未在 3000 端口就绪，请查看 storage/logs/frontend.log")
        return 1

    print("服务已启动")
    print("前端：http://127.0.0.1:3000")
    print("后端：http://127.0.0.1:8000/api/health")
    for ip in local_lan_ips():
        print(f"局域网前端：http://{ip}:3000")
        print(f"局域网后端：http://{ip}:8000/api/health")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
