from __future__ import annotations

import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_PATH = PROJECT_ROOT / "app.py"
APP_URL = "http://127.0.0.1:5000"
REQUIREMENTS_PATH = PROJECT_ROOT / "requirements.txt"
LOG_DIR = PROJECT_ROOT / "storage" / "logs"
STDOUT_LOG = LOG_DIR / "server_stdout.log"
STDERR_LOG = LOG_DIR / "server_stderr.log"
PID_FILE = LOG_DIR / "server.pid"
VENV_DIR = PROJECT_ROOT / ".venv"
VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"
VENV_READY_FILE = LOG_DIR / "venv_ready.txt"


def port_ready(timeout_seconds: int = 30) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(APP_URL, timeout=2) as response:
                if response.status >= 200:
                    return True
        except urllib.error.URLError:
            time.sleep(0.5)
    return False


def server_running() -> bool:
    try:
        with urllib.request.urlopen(APP_URL, timeout=2) as response:
            return response.status >= 200
    except urllib.error.URLError:
        return False


def open_browser() -> None:
    try:
        os.startfile(APP_URL)
    except OSError:
        pass


def print_logs() -> None:
    if STDERR_LOG.exists():
        print("--- stderr ---")
        print(STDERR_LOG.read_text(encoding="utf-8", errors="replace"))
    if STDOUT_LOG.exists():
        print("--- stdout ---")
        print(STDOUT_LOG.read_text(encoding="utf-8", errors="replace"))


def local_ips() -> list[str]:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -ExpandProperty IPAddress"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def run_command(command: list[str], message: str) -> None:
    result = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode == 0:
        return

    print(message)
    if result.stderr.strip():
        print(result.stderr.strip())
    if result.stdout.strip():
        print(result.stdout.strip())
    raise SystemExit(1)


def ensure_runtime() -> Path:
    if not VENV_PYTHON.exists():
        print("Creating local runtime...")
        run_command([sys.executable, "-m", "venv", str(VENV_DIR)], "Failed to create local venv.")

    need_install = True
    if VENV_READY_FILE.exists() and REQUIREMENTS_PATH.exists():
        need_install = VENV_READY_FILE.read_text(encoding="utf-8").strip() != str(REQUIREMENTS_PATH.stat().st_mtime_ns)

    if need_install:
        print("Installing dependencies...")
        run_command([str(VENV_PYTHON), "-m", "pip", "install", "-r", str(REQUIREMENTS_PATH)], "Failed to install dependencies.")
        VENV_READY_FILE.write_text(str(REQUIREMENTS_PATH.stat().st_mtime_ns), encoding="utf-8")

    return VENV_PYTHON


def main() -> int:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    runtime_python = ensure_runtime()

    if server_running():
        print("Server started.")
        print(f"Local: {APP_URL}")
        for ip in local_ips():
            print(f"LAN: http://{ip}:5000")
        open_browser()
        return 0

    for path in [STDOUT_LOG, STDERR_LOG]:
        if path.exists():
            path.unlink()

    stdout_handle = STDOUT_LOG.open("w", encoding="utf-8")
    stderr_handle = STDERR_LOG.open("w", encoding="utf-8")

    creation_flags = 0
    if os.name == "nt":
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS

    process = subprocess.Popen(
        [str(runtime_python), str(APP_PATH)],
        cwd=PROJECT_ROOT,
        stdout=stdout_handle,
        stderr=stderr_handle,
        creationflags=creation_flags,
    )
    PID_FILE.write_text(str(process.pid), encoding="utf-8")

    try:
        if process.poll() is not None:
            print("Python process exited during startup.")
            stdout_handle.close()
            stderr_handle.close()
            print_logs()
            return 1

        if not port_ready():
            print("Server not ready on port 5000.")
            stdout_handle.close()
            stderr_handle.close()
            print_logs()
            return 1
    finally:
        stdout_handle.close()
        stderr_handle.close()

    print("Server started.")
    print(f"Local: {APP_URL}")
    for ip in local_ips():
        print(f"LAN: http://{ip}:5000")
    open_browser()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
