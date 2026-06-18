from __future__ import annotations

import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PID_FILE = PROJECT_ROOT / "storage" / "logs" / "fullstack.pid"


def main() -> int:
    if not PID_FILE.exists():
        print("没有找到 fullstack.pid")
        return 0
    for line in PID_FILE.read_text(encoding="utf-8").splitlines():
        pid = line.strip()
        if pid:
            subprocess.run(["taskkill", "/PID", pid, "/T", "/F"], check=False, capture_output=True)
    PID_FILE.unlink(missing_ok=True)
    print("服务已停止")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
