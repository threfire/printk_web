from __future__ import annotations

import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PID_FILE = PROJECT_ROOT / "storage" / "logs" / "server.pid"


def listener_pids() -> list[str]:
    result = subprocess.run(
        ["netstat", "-ano", "-p", "tcp"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    pids: set[str] = set()
    for line in result.stdout.splitlines():
        text = " ".join(line.split())
        if ":5000" not in text:
            continue
        if "LISTENING" not in text:
            continue
        parts = text.split(" ")
        if parts:
            pids.add(parts[-1])
    return sorted(pids)


def stop_pid(pid: str) -> None:
    subprocess.run(["taskkill", "/PID", pid, "/F"], capture_output=True, text=True, check=False)


def main() -> int:
    pids = listener_pids()
    if not pids and PID_FILE.exists():
        pids = [PID_FILE.read_text(encoding="utf-8").strip()]

    pids = [pid for pid in pids if pid]
    if not pids:
        print("Server is not running.")
        return 0

    for pid in pids:
        stop_pid(pid)

    if PID_FILE.exists():
        PID_FILE.unlink()

    print("Server stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
