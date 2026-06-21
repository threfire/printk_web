from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import os
import shutil
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from urllib.parse import quote

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from openpyxl import Workbook, load_workbook
from pydantic import BaseModel


PROJECT_ROOT = Path(__file__).resolve().parents[2]
STORAGE_DIR = PROJECT_ROOT / "storage"
DB_PATH = STORAGE_DIR / "system.db"

UNREGISTERED_DIR = STORAGE_DIR / "invoices" / "unregistered"
PENDING_REVIEW_DIR = STORAGE_DIR / "invoices" / "pending_review"
IN_STOCK_DIR = STORAGE_DIR / "invoices" / "in_stock"
OUT_STOCK_DIR = STORAGE_DIR / "invoices" / "out_stock"
PROCESSING_DIR = STORAGE_DIR / "invoices" / "processing"

DUPLICATE_ARCHIVE_DIR = STORAGE_DIR / "archive" / "duplicate_invoice"
PARSE_FAILED_DIR = STORAGE_DIR / "archive" / "parse_failed"
VALIDATION_FAILED_DIR = STORAGE_DIR / "archive" / "validation_failed"
REVIEW_REJECTED_DIR = STORAGE_DIR / "archive" / "review_rejected"

IN_STOCK_MASTER_DIR = STORAGE_DIR / "master" / "in_stock_master"
OUT_STOCK_MASTER_DIR = STORAGE_DIR / "master" / "out_stock_master"
REIMBURSEMENT_EXPORT_DIR = STORAGE_DIR / "master" / "reimbursement_export"
TEMP_DIR = STORAGE_DIR / "temp"

MAX_CONTENT_LENGTH = 50 * 1024 * 1024
AGENT_INTERVAL_SECONDS = int(os.getenv("AGENT_INTERVAL_SECONDS", "300"))
SECRET_KEY = os.getenv("SECRET_KEY", "material-agent-secret")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "weareprintk")
GROUP_LEADER_PASSWORD = os.getenv("GROUP_LEADER_PASSWORD", "group123")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:3000,http://localhost:3000")
AGENT_LOCK = threading.Lock()

HEADER_MAP = {
    "采购日期": "purchase_date",
    "物资名称": "item_name",
    "规格型号": "spec_model",
    "单位": "unit",
    "数量": "quantity",
    "单价": "unit_price",
    "金额": "amount",
    "供应商": "supplier_name",
    "发票代码": "invoice_code",
    "发票号码": "invoice_number",
    "发票日期": "invoice_date",
    "发票金额": "invoice_amount",
    "备注": "remark",
}
REQUIRED_HEADERS = ["采购日期", "物资名称", "单位", "数量", "单价", "金额", "发票号码"]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_header(value: Any) -> str:
    return "".join(normalize_text(value).lstrip("\ufeff").split())


def build_batch_id(submitter_id: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_submitter = "".join(ch for ch in submitter_id if ch.isalnum() or ch in ("-", "_")) or "member"
    return f"{timestamp}_{safe_submitter}_{uuid.uuid4().hex[:4]}"


def normalize_number(value: Any, field_name: str, required: bool) -> float | None:
    text = normalize_text(value)
    if not text:
        if required:
            raise ValueError(f"{field_name}不能为空")
        return None
    try:
        return float(Decimal(text))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"{field_name}格式错误") from exc


def normalize_date(value: Any, field_name: str, required: bool) -> str:
    if value in (None, ""):
        if required:
            raise ValueError(f"{field_name}不能为空")
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = normalize_text(value).replace("/", "-").replace(".", "-")
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y%m%d"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"{field_name}格式错误")


def ensure_directories() -> None:
    for path in [
        UNREGISTERED_DIR,
        PENDING_REVIEW_DIR,
        IN_STOCK_DIR,
        OUT_STOCK_DIR,
        PROCESSING_DIR,
        DUPLICATE_ARCHIVE_DIR,
        PARSE_FAILED_DIR,
        VALIDATION_FAILED_DIR,
        REVIEW_REJECTED_DIR,
        IN_STOCK_MASTER_DIR,
        OUT_STOCK_MASTER_DIR,
        REIMBURSEMENT_EXPORT_DIR,
        TEMP_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)


@contextmanager
def db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    ensure_directories()
    with db_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS upload_batch (
                id TEXT PRIMARY KEY,
                team_name TEXT NOT NULL,
                submitter_name TEXT NOT NULL,
                submitter_id TEXT NOT NULL,
                submitted_at TEXT NOT NULL,
                form_file_path TEXT NOT NULL,
                remark TEXT DEFAULT '',
                status TEXT NOT NULL,
                folder_stage TEXT NOT NULL,
                review_note TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS staged_purchase_record (
                id TEXT PRIMARY KEY,
                batch_id TEXT NOT NULL,
                row_no INTEGER NOT NULL,
                purchase_date TEXT NOT NULL,
                item_name TEXT NOT NULL,
                spec_model TEXT DEFAULT '',
                unit TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                amount REAL NOT NULL,
                supplier_name TEXT DEFAULT '',
                invoice_code TEXT DEFAULT '',
                invoice_number TEXT NOT NULL,
                invoice_date TEXT DEFAULT '',
                invoice_amount REAL,
                remark TEXT DEFAULT '',
                review_status TEXT NOT NULL,
                review_note TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS purchase_record (
                id TEXT PRIMARY KEY,
                batch_id TEXT NOT NULL,
                staged_record_id TEXT NOT NULL UNIQUE,
                row_no INTEGER NOT NULL,
                purchase_date TEXT NOT NULL,
                item_name TEXT NOT NULL,
                spec_model TEXT DEFAULT '',
                unit TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                amount REAL NOT NULL,
                supplier_name TEXT DEFAULT '',
                invoice_code TEXT DEFAULT '',
                invoice_number TEXT NOT NULL,
                invoice_date TEXT DEFAULT '',
                invoice_amount REAL,
                remark TEXT DEFAULT '',
                stock_status TEXT NOT NULL,
                reimbursed_at TEXT DEFAULT '',
                reimbursement_batch_id TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS invoice_registry (
                id TEXT PRIMARY KEY,
                invoice_number TEXT NOT NULL UNIQUE,
                batch_id TEXT NOT NULL,
                purchase_record_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reimbursement_batch (
                id TEXT PRIMARY KEY,
                batch_name TEXT NOT NULL,
                extracted_by TEXT NOT NULL,
                extracted_at TEXT NOT NULL,
                record_count INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                export_file_path TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reimbursement_record (
                id TEXT PRIMARY KEY,
                reimbursement_batch_id TEXT NOT NULL,
                purchase_record_id TEXT NOT NULL,
                invoice_number TEXT NOT NULL,
                reimbursed_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS process_log (
                id TEXT PRIMARY KEY,
                batch_id TEXT,
                stage TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS season_plan (
                id TEXT PRIMARY KEY,
                season_year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                group_name TEXT NOT NULL,
                status TEXT NOT NULL,
                target TEXT NOT NULL,
                display_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (season_year, month, group_name)
            );

            CREATE TABLE IF NOT EXISTS site_account (
                account TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                full_name TEXT DEFAULT '',
                gender TEXT DEFAULT '',
                grade TEXT DEFAULT '',
                member_status TEXT DEFAULT '',
                department TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                email TEXT DEFAULT '',
                bio TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS forum_post (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author_account TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (author_account) REFERENCES site_account(account)
            );

            CREATE TABLE IF NOT EXISTS forum_reply (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                content TEXT NOT NULL,
                author_account TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES forum_post(id),
                FOREIGN KEY (author_account) REFERENCES site_account(account)
            );

            CREATE INDEX IF NOT EXISTS idx_season_plan_period
            ON season_plan (season_year, month, display_order);

            CREATE INDEX IF NOT EXISTS idx_forum_post_created_at
            ON forum_post (created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_forum_reply_post_created_at
            ON forum_reply (post_id, created_at);
            """
        )
        ensure_site_account_profile_columns(conn)
        seed_season_plan(conn)


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def seed_season_plan(conn: sqlite3.Connection) -> None:
    existing = conn.execute(
        "SELECT COUNT(*) AS total FROM season_plan WHERE season_year = ? AND month = ?",
        (2026, 6),
    ).fetchone()
    if existing and existing["total"] > 0:
        return
    plans = [
        ("电控组", "准备中", "完成底盘通信、功率管理和基础控制联调。"),
        ("机械组", "准备中", "完成关键机构方案评审和第一轮装配验证。"),
        ("算法组", "准备中", "完成自动导航、策略接口和仿真数据整理。"),
        ("视觉组", "准备中", "完成识别流程、相机标定和目标跟踪测试。"),
        ("运营组", "准备中", "完成物资清单、预算台账和赛季宣传计划。"),
    ]
    timestamp = now_iso()
    conn.executemany(
        """
        INSERT INTO season_plan (
            id, season_year, month, group_name, status, target,
            display_order, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (uuid.uuid4().hex, 2026, 6, group, status, target, index, timestamp, timestamp)
            for index, (group, status, target) in enumerate(plans, start=1)
        ],
    )


def make_token(role: str) -> str:
    payload = f"{role}:{int(time.time())}"
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    raw = f"{payload}:{signature}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def normalize_account(value: str) -> str:
    account = value.strip()
    if not account or len(account) > 32:
        raise HTTPException(status_code=400, detail="账号长度需为 1 到 32 个字符")
    return account


def ensure_site_account_profile_columns(conn: sqlite3.Connection) -> None:
    existing_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(site_account)").fetchall()
    }
    profile_columns = {
        "full_name": "TEXT DEFAULT ''",
        "gender": "TEXT DEFAULT ''",
        "grade": "TEXT DEFAULT ''",
        "member_status": "TEXT DEFAULT ''",
        "department": "TEXT DEFAULT ''",
        "phone": "TEXT DEFAULT ''",
        "email": "TEXT DEFAULT ''",
        "bio": "TEXT DEFAULT ''",
    }
    for column, definition in profile_columns.items():
        if column not in existing_columns:
            conn.execute(f"ALTER TABLE site_account ADD COLUMN {column} {definition}")


GENDER_OPTIONS = {"", "男", "女", "其他"}
GRADE_OPTIONS = {"", "大一", "大二", "大三", "大四", "研究生"}
MEMBER_STATUS_OPTIONS = {"", "非战队队员", "梯队队员", "正式队员", "老队员", "退役队员", "老师"}
DEPARTMENT_OPTIONS = {"", "电控", "机械", "算法", "运营"}


def normalize_limited_text(value: str, field_name: str, max_length: int = 80) -> str:
    text = value.strip()
    if len(text) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name}不能超过 {max_length} 个字符")
    return text


def normalize_choice(value: str, field_name: str, allowed_values: set[str]) -> str:
    text = value.strip()
    if text not in allowed_values:
        raise HTTPException(status_code=400, detail=f"{field_name}格式错误")
    return text


def normalize_site_profile(profile: "SiteAccountProfile") -> dict[str, str]:
    return {
        "full_name": normalize_limited_text(profile.full_name, "姓名", 32),
        "gender": normalize_choice(profile.gender, "性别", GENDER_OPTIONS),
        "grade": normalize_choice(profile.grade, "年级", GRADE_OPTIONS),
        "member_status": normalize_choice(profile.member_status, "身份信息", MEMBER_STATUS_OPTIONS),
        "department": normalize_choice(profile.department, "部门信息", DEPARTMENT_OPTIONS),
        "phone": normalize_limited_text(profile.phone, "联系电话", 32),
        "email": normalize_limited_text(profile.email, "邮箱", 80),
        "bio": normalize_limited_text(profile.bio, "个人说明", 200),
    }


def site_account_response(row: sqlite3.Row) -> dict[str, str]:
    return {
        "account": row["account"],
        "full_name": row["full_name"] or "",
        "gender": row["gender"] or "",
        "grade": row["grade"] or "",
        "member_status": row["member_status"] or "",
        "department": row["department"] or "",
        "phone": row["phone"] or "",
        "email": row["email"] or "",
        "bio": row["bio"] or "",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def forum_author_name(row: sqlite3.Row) -> str:
    return row["full_name"] or row["author_account"]


def forum_post_response(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "author_account": row["author_account"],
        "author_name": forum_author_name(row),
        "reply_count": row["reply_count"] if "reply_count" in row.keys() else 0,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def forum_reply_response(row: sqlite3.Row) -> dict[str, str]:
    return {
        "id": row["id"],
        "post_id": row["post_id"],
        "content": row["content"],
        "author_account": row["author_account"],
        "author_name": forum_author_name(row),
        "created_at": row["created_at"],
    }


def normalize_forum_title(value: str) -> str:
    title = value.strip()
    if len(title) < 2 or len(title) > 80:
        raise HTTPException(status_code=400, detail="标题长度需为 2 到 80 个字符")
    return title


def normalize_forum_content(value: str, field_name: str = "内容", max_length: int = 5000) -> str:
    content = value.strip()
    if not content:
        raise HTTPException(status_code=400, detail=f"{field_name}不能为空")
    if len(content) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name}不能超过 {max_length} 个字符")
    return content


def ensure_forum_author(conn: sqlite3.Connection, account: str) -> str:
    normalized_account = normalize_account(account)
    row = conn.execute("SELECT account FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="账号不存在，请重新登录")
    return normalized_account


def validate_site_password(password: str) -> str:
    if len(password) < 6 or len(password) > 72:
        raise HTTPException(status_code=400, detail="密码长度需为 6 到 72 个字符")
    return password


def hash_site_password(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_site_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt, digest = stored_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    current_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000).hex()
    return hmac.compare_digest(current_digest, digest)


def verify_token(token: str, allowed_roles: set[str]) -> str:
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        role, timestamp, signature = decoded.split(":", 2)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="登录状态无效") from exc
    payload = f"{role}:{timestamp}"
    expected = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="登录状态无效")
    if role not in allowed_roles:
        raise HTTPException(status_code=403, detail="权限不足")
    return role


def require_admin(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录管理员后台")
    return verify_token(authorization.removeprefix("Bearer ").strip(), {"admin"})


def require_plan_editor(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    return verify_token(authorization.removeprefix("Bearer ").strip(), {"admin", "group_leader"})


def log_process(stage: str, level: str, message: str, batch_id: str | None = None) -> None:
    with db_connection() as conn:
        conn.execute(
            """
            INSERT INTO process_log (id, batch_id, stage, level, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (uuid.uuid4().hex, batch_id, stage, level, message, now_iso()),
        )


def stage_path(stage: str) -> Path:
    mapping = {
        "unregistered": UNREGISTERED_DIR,
        "pending_review": PENDING_REVIEW_DIR,
        "in_stock": IN_STOCK_DIR,
        "out_stock": OUT_STOCK_DIR,
        "processing": PROCESSING_DIR,
        "duplicate_invoice": DUPLICATE_ARCHIVE_DIR,
        "parse_failed": PARSE_FAILED_DIR,
        "validation_failed": VALIDATION_FAILED_DIR,
        "review_rejected": REVIEW_REJECTED_DIR,
    }
    return mapping[stage]


def batch_form_path(batch_id: str, folder_stage: str) -> Path:
    return stage_path(folder_stage) / batch_id / "form.xlsx"


def move_batch_folder(batch_id: str, from_stage: str, to_stage: str) -> None:
    source = stage_path(from_stage) / batch_id
    target = stage_path(to_stage) / batch_id
    if not source.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        shutil.rmtree(target)
    shutil.move(str(source), str(target))


def write_meta(batch_dir: Path, meta: dict[str, Any]) -> None:
    (batch_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_excel(form_path: Path) -> list[dict[str, Any]]:
    workbook = load_workbook(form_path, data_only=True)
    sheet = workbook.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        raise ValueError("表格为空")
    headers = [normalize_header(cell) for cell in rows[0]]
    for required_header in REQUIRED_HEADERS:
        if normalize_header(required_header) not in headers:
            raise ValueError(f"缺少必填列：{required_header}")
    header_indexes = {
        name: headers.index(normalize_header(name))
        for name in HEADER_MAP
        if normalize_header(name) in headers
    }

    parsed_rows: list[dict[str, Any]] = []
    for row_no, row in enumerate(rows[1:], start=2):
        row_values = list(row)
        if not any(value not in (None, "") for value in row_values):
            continue

        def cell(header_name: str) -> Any:
            index = header_indexes.get(header_name)
            if index is None or index >= len(row_values):
                return None
            return row_values[index]

        record = {
            "row_no": row_no,
            "purchase_date": normalize_date(cell("采购日期"), "采购日期", True),
            "item_name": normalize_text(cell("物资名称")),
            "spec_model": normalize_text(cell("规格型号")),
            "unit": normalize_text(cell("单位")),
            "quantity": normalize_number(cell("数量"), "数量", True),
            "unit_price": normalize_number(cell("单价"), "单价", True),
            "amount": normalize_number(cell("金额"), "金额", True),
            "supplier_name": normalize_text(cell("供应商")),
            "invoice_code": normalize_text(cell("发票代码")),
            "invoice_number": normalize_text(cell("发票号码")),
            "invoice_date": normalize_date(cell("发票日期"), "发票日期", False),
            "invoice_amount": normalize_number(cell("发票金额"), "发票金额", False),
            "remark": normalize_text(cell("备注")),
        }
        if not record["item_name"]:
            raise ValueError(f"第 {row_no} 行物资名称不能为空")
        if not record["unit"]:
            raise ValueError(f"第 {row_no} 行单位不能为空")
        if not record["invoice_number"]:
            raise ValueError(f"第 {row_no} 行发票号码不能为空")
        parsed_rows.append(record)

    if not parsed_rows:
        raise ValueError("表格没有有效数据")
    return parsed_rows


def invoice_exists(conn: sqlite3.Connection, invoice_number: str) -> tuple[bool, str]:
    pending = conn.execute(
        """
        SELECT batch_id FROM staged_purchase_record
        WHERE invoice_number = ? AND review_status = 'pending_review'
        LIMIT 1
        """,
        (invoice_number,),
    ).fetchone()
    if pending:
        return True, f"待入库阶段已存在相同发票号码，批次 {pending['batch_id']}"
    registry = conn.execute("SELECT batch_id FROM invoice_registry WHERE invoice_number = ? LIMIT 1", (invoice_number,)).fetchone()
    if registry:
        return True, f"库内已存在相同发票号码，批次 {registry['batch_id']}"
    reimbursement = conn.execute(
        "SELECT reimbursement_batch_id FROM reimbursement_record WHERE invoice_number = ? LIMIT 1",
        (invoice_number,),
    ).fetchone()
    if reimbursement:
        return True, f"已存在出库报销记录，出库批次 {reimbursement['reimbursement_batch_id']}"
    return False, ""


def fail_batch(batch_id: str, from_stage: str, target_stage: str, status: str, reason: str) -> None:
    move_batch_folder(batch_id, from_stage, target_stage)
    with db_connection() as conn:
        conn.execute(
            """
            UPDATE upload_batch
            SET status = ?, folder_stage = ?, form_file_path = ?, review_note = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, target_stage, str(batch_form_path(batch_id, target_stage)), reason, now_iso(), batch_id),
        )
    log_process("local_review", "error", reason, batch_id)


def process_batch(batch_row: sqlite3.Row) -> None:
    batch_id = batch_row["id"]
    move_batch_folder(batch_id, "unregistered", "processing")
    with db_connection() as conn:
        conn.execute(
            """
            UPDATE upload_batch
            SET status = 'processing', folder_stage = 'processing', form_file_path = ?, updated_at = ?
            WHERE id = ?
            """,
            (str(batch_form_path(batch_id, "processing")), now_iso(), batch_id),
        )
    form_path = PROCESSING_DIR / batch_id / "form.xlsx"
    try:
        parsed_rows = parse_excel(form_path)
    except ValueError as exc:
        fail_batch(batch_id, "processing", "validation_failed", "validation_failed", str(exc))
        return
    except Exception as exc:  # noqa: BLE001
        fail_batch(batch_id, "processing", "parse_failed", "parse_failed", f"解析失败：{exc}")
        return

    invoice_numbers = [row["invoice_number"] for row in parsed_rows]
    if len(invoice_numbers) != len(set(invoice_numbers)):
        fail_batch(batch_id, "processing", "duplicate_invoice", "duplicate_invoice", "当前表格存在重复发票号码")
        return

    with db_connection() as conn:
        for row in parsed_rows:
            exists, reason = invoice_exists(conn, row["invoice_number"])
            if exists:
                fail_batch(batch_id, "processing", "duplicate_invoice", "duplicate_invoice", reason)
                return
        current_time = now_iso()
        for row in parsed_rows:
            conn.execute(
                """
                INSERT INTO staged_purchase_record (
                    id, batch_id, row_no, purchase_date, item_name, spec_model, unit,
                    quantity, unit_price, amount, supplier_name, invoice_code,
                    invoice_number, invoice_date, invoice_amount, remark,
                    review_status, review_note, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uuid.uuid4().hex,
                    batch_id,
                    row["row_no"],
                    row["purchase_date"],
                    row["item_name"],
                    row["spec_model"],
                    row["unit"],
                    row["quantity"],
                    row["unit_price"],
                    row["amount"],
                    row["supplier_name"],
                    row["invoice_code"],
                    row["invoice_number"],
                    row["invoice_date"],
                    row["invoice_amount"],
                    row["remark"],
                    "pending_review",
                    "",
                    current_time,
                    current_time,
                ),
            )
        conn.execute(
            """
            UPDATE upload_batch
            SET status = 'pending_review', folder_stage = 'pending_review', form_file_path = ?, review_note = '', updated_at = ?
            WHERE id = ?
            """,
            (str(batch_form_path(batch_id, "pending_review")), current_time, batch_id),
        )
    move_batch_folder(batch_id, "processing", "pending_review")
    log_process("local_review", "info", "批次审核通过，已进入待入库队列", batch_id)


def run_agent_once() -> int:
    if not AGENT_LOCK.acquire(blocking=False):
        return 0
    try:
        with db_connection() as conn:
            batches = conn.execute(
                """
                SELECT * FROM upload_batch
                WHERE status = 'unregistered' AND folder_stage = 'unregistered'
                ORDER BY submitted_at ASC
                """
            ).fetchall()
        for batch in batches:
            process_batch(batch)
        return len(batches)
    finally:
        AGENT_LOCK.release()


def confirm_staged_rows(batch_id: str, row_ids: list[str]) -> int:
    if not row_ids:
        return 0
    with db_connection() as conn:
        placeholders = ",".join("?" for _ in row_ids)
        rows = conn.execute(
            f"""
            SELECT * FROM staged_purchase_record
            WHERE batch_id = ? AND id IN ({placeholders}) AND review_status = 'pending_review'
            """,
            [batch_id, *row_ids],
        ).fetchall()
        current_time = now_iso()
        for row in rows:
            purchase_record_id = uuid.uuid4().hex
            conn.execute(
                """
                INSERT INTO purchase_record (
                    id, batch_id, staged_record_id, row_no, purchase_date, item_name, spec_model,
                    unit, quantity, unit_price, amount, supplier_name, invoice_code,
                    invoice_number, invoice_date, invoice_amount, remark,
                    stock_status, reimbursed_at, reimbursement_batch_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    purchase_record_id,
                    row["batch_id"],
                    row["id"],
                    row["row_no"],
                    row["purchase_date"],
                    row["item_name"],
                    row["spec_model"],
                    row["unit"],
                    row["quantity"],
                    row["unit_price"],
                    row["amount"],
                    row["supplier_name"],
                    row["invoice_code"],
                    row["invoice_number"],
                    row["invoice_date"],
                    row["invoice_amount"],
                    row["remark"],
                    "in_stock",
                    "",
                    "",
                    current_time,
                    current_time,
                ),
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO invoice_registry (id, invoice_number, batch_id, purchase_record_id, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (uuid.uuid4().hex, row["invoice_number"], batch_id, purchase_record_id, current_time),
            )
            conn.execute(
                """
                UPDATE staged_purchase_record
                SET review_status = 'confirmed', review_note = '管理员确认入库', updated_at = ?
                WHERE id = ?
                """,
                (current_time, row["id"]),
            )
    export_master_sheets()
    return len(rows)


def reject_staged_rows(batch_id: str, row_ids: list[str], note: str) -> int:
    if not row_ids:
        return 0
    with db_connection() as conn:
        placeholders = ",".join("?" for _ in row_ids)
        result = conn.execute(
            f"""
            UPDATE staged_purchase_record
            SET review_status = 'rejected', review_note = ?, updated_at = ?
            WHERE batch_id = ? AND id IN ({placeholders}) AND review_status = 'pending_review'
            """,
            [note, now_iso(), batch_id, *row_ids],
        )
    return result.rowcount


def finalize_batch_review(batch_id: str) -> tuple[bool, str]:
    with db_connection() as conn:
        batch = conn.execute("SELECT * FROM upload_batch WHERE id = ?", (batch_id,)).fetchone()
        if batch is None:
            return False, "批次不存在"
        counts = conn.execute(
            """
            SELECT
                SUM(CASE WHEN review_status = 'pending_review' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN review_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
                SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
            FROM staged_purchase_record
            WHERE batch_id = ?
            """,
            (batch_id,),
        ).fetchone()
        if counts["pending_count"]:
            return False, "仍有待确认明细"
        current_time = now_iso()
        if counts["confirmed_count"]:
            move_batch_folder(batch_id, "pending_review", "in_stock")
            conn.execute(
                """
                UPDATE upload_batch
                SET status = 'in_stock', folder_stage = 'in_stock', form_file_path = ?, updated_at = ?
                WHERE id = ?
                """,
                (str(batch_form_path(batch_id, "in_stock")), current_time, batch_id),
            )
            export_master_sheets()
            return True, "批次已进入库内"
        move_batch_folder(batch_id, "pending_review", "review_rejected")
        conn.execute(
            """
            UPDATE upload_batch
            SET status = 'review_rejected', folder_stage = 'review_rejected', form_file_path = ?, updated_at = ?
            WHERE id = ?
            """,
            (str(batch_form_path(batch_id, "review_rejected")), current_time, batch_id),
        )
    return True, "批次已全部打回"


def export_records_to_excel(path: Path, rows: list[sqlite3.Row]) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "数据"
    sheet.append(
        [
            "批次编号",
            "表格行号",
            "采购日期",
            "物资名称",
            "规格型号",
            "单位",
            "数量",
            "单价",
            "金额",
            "供应商",
            "发票代码",
            "发票号码",
            "发票日期",
            "发票金额",
            "备注",
            "库存状态",
            "出库时间",
        ]
    )
    for row in rows:
        sheet.append(
            [
                row["batch_id"],
                row["row_no"],
                row["purchase_date"],
                row["item_name"],
                row["spec_model"],
                row["unit"],
                row["quantity"],
                row["unit_price"],
                row["amount"],
                row["supplier_name"],
                row["invoice_code"],
                row["invoice_number"],
                row["invoice_date"],
                row["invoice_amount"],
                row["remark"],
                row["stock_status"],
                row["reimbursed_at"],
            ]
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(path)


def export_master_sheets() -> None:
    with db_connection() as conn:
        in_stock_rows = conn.execute(
            """
            SELECT pr.* FROM purchase_record pr
            JOIN upload_batch ub ON ub.id = pr.batch_id
            WHERE pr.stock_status = 'in_stock' AND ub.folder_stage = 'in_stock'
            ORDER BY created_at ASC
            """
        ).fetchall()
        out_stock_rows = conn.execute(
            """
            SELECT pr.* FROM purchase_record pr
            JOIN upload_batch ub ON ub.id = pr.batch_id
            WHERE pr.stock_status = 'out_stock' AND ub.folder_stage = 'out_stock'
            ORDER BY updated_at ASC
            """
        ).fetchall()
    export_records_to_excel(IN_STOCK_MASTER_DIR / "库内总表.xlsx", in_stock_rows)
    export_records_to_excel(OUT_STOCK_MASTER_DIR / "出库历史总表.xlsx", out_stock_rows)


def build_template_workbook() -> io.BytesIO:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "采购模板"
    sheet.append(list(HEADER_MAP.keys()))
    sheet.append(["2026-06-18", "A4纸", "80g", "包", 2, 25, 50, "文具店", "FP01", "INV-0001", "2026-06-18", 50, "示例数据"])
    stream = io.BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return stream


def export_reimbursement(record_ids: list[str]) -> tuple[bool, str]:
    if not record_ids:
        return False, "请选择需要出库的库内明细"
    with db_connection() as conn:
        placeholders = ",".join("?" for _ in record_ids)
        rows = conn.execute(
            f"""
            SELECT pr.* FROM purchase_record pr
            JOIN upload_batch ub ON ub.id = pr.batch_id
            WHERE pr.id IN ({placeholders}) AND pr.stock_status = 'in_stock' AND ub.folder_stage = 'in_stock'
            ORDER BY batch_id ASC, row_no ASC
            """,
            record_ids,
        ).fetchall()
        if not rows:
            return False, "没有可出库的库内明细"
        reimbursement_id = f"RB{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4]}"
        export_path = REIMBURSEMENT_EXPORT_DIR / f"{reimbursement_id}.xlsx"
        export_records_to_excel(export_path, rows)
        total_amount = sum(row["amount"] for row in rows)
        current_time = now_iso()
        conn.execute(
            """
            INSERT INTO reimbursement_batch (
                id, batch_name, extracted_by, extracted_at, record_count,
                total_amount, export_file_path, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (reimbursement_id, f"报销提取_{reimbursement_id}", "管理员", current_time, len(rows), total_amount, str(export_path), current_time),
        )
        affected_batches: set[str] = set()
        for row in rows:
            conn.execute(
                """
                INSERT INTO reimbursement_record (
                    id, reimbursement_batch_id, purchase_record_id,
                    invoice_number, reimbursed_at, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (uuid.uuid4().hex, reimbursement_id, row["id"], row["invoice_number"], current_time, current_time),
            )
            conn.execute(
                """
                UPDATE purchase_record
                SET stock_status = 'out_stock', reimbursed_at = ?, reimbursement_batch_id = ?, updated_at = ?
                WHERE id = ?
                """,
                (current_time, reimbursement_id, current_time, row["id"]),
            )
            affected_batches.add(row["batch_id"])
        for batch_id in affected_batches:
            remaining = conn.execute(
                "SELECT COUNT(*) AS total FROM purchase_record WHERE batch_id = ? AND stock_status = 'in_stock'",
                (batch_id,),
            ).fetchone()["total"]
            if remaining == 0:
                move_batch_folder(batch_id, "in_stock", "out_stock")
                conn.execute(
                    """
                    UPDATE upload_batch
                    SET status = 'out_stock', folder_stage = 'out_stock', form_file_path = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (str(batch_form_path(batch_id, "out_stock")), current_time, batch_id),
                )
    export_master_sheets()
    return True, reimbursement_id


def dashboard_data() -> dict[str, Any]:
    with db_connection() as conn:
        counts = {
            "unregistered": conn.execute("SELECT COUNT(*) AS total FROM upload_batch WHERE status = 'unregistered'").fetchone()["total"],
            "pending_review": conn.execute("SELECT COUNT(*) AS total FROM upload_batch WHERE folder_stage = 'pending_review'").fetchone()["total"],
            "in_stock": conn.execute(
                """
                SELECT COUNT(*) AS total FROM purchase_record pr
                JOIN upload_batch ub ON ub.id = pr.batch_id
                WHERE pr.stock_status = 'in_stock' AND ub.folder_stage = 'in_stock'
                """
            ).fetchone()["total"],
            "out_stock": conn.execute(
                """
                SELECT COUNT(*) AS total FROM purchase_record pr
                JOIN upload_batch ub ON ub.id = pr.batch_id
                WHERE pr.stock_status = 'out_stock' AND ub.folder_stage = 'out_stock'
                """
            ).fetchone()["total"],
        }
        pending_batches = [row_to_dict(row) for row in conn.execute(
            """
            SELECT
                ub.*,
                SUM(CASE WHEN spr.review_status = 'pending_review' THEN 1 ELSE 0 END) AS pending_rows,
                SUM(CASE WHEN spr.review_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_rows,
                SUM(CASE WHEN spr.review_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_rows
            FROM upload_batch ub
            LEFT JOIN staged_purchase_record spr ON spr.batch_id = ub.id
            WHERE ub.folder_stage = 'pending_review'
            GROUP BY ub.id
            ORDER BY ub.submitted_at ASC
            """
        ).fetchall()]
        in_stock_rows = [row_to_dict(row) for row in conn.execute(
            """
            SELECT pr.* FROM purchase_record pr
            JOIN upload_batch ub ON ub.id = pr.batch_id
            WHERE pr.stock_status = 'in_stock' AND ub.folder_stage = 'in_stock'
            ORDER BY pr.created_at ASC
            """
        ).fetchall()]
        reimbursement_batches = [row_to_dict(row) for row in conn.execute(
            "SELECT * FROM reimbursement_batch ORDER BY created_at DESC LIMIT 10"
        ).fetchall()]
        logs = [row_to_dict(row) for row in conn.execute("SELECT * FROM process_log ORDER BY created_at DESC LIMIT 20").fetchall()]
    return {"counts": counts, "pending_batches": pending_batches, "in_stock_rows": in_stock_rows, "reimbursement_batches": reimbursement_batches, "logs": logs}


def validate_plan_period(season_year: int, month: int) -> None:
    if season_year < 2020 or season_year > 2100:
        raise HTTPException(status_code=400, detail="赛季年份格式错误")
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="月份格式错误")


def list_season_plan(season_year: int, month: int) -> list[dict[str, Any]]:
    validate_plan_period(season_year, month)
    with db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, season_year, month, group_name, status, target, display_order, updated_at
            FROM season_plan
            WHERE season_year = ? AND month = ?
            ORDER BY display_order ASC, group_name ASC
            """,
            (season_year, month),
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def save_season_plan(season_year: int, month: int, plans: list["SeasonPlanItem"]) -> list[dict[str, Any]]:
    validate_plan_period(season_year, month)
    if not plans:
        raise HTTPException(status_code=400, detail="计划不能为空")
    timestamp = now_iso()
    with db_connection() as conn:
        for index, plan in enumerate(plans, start=1):
            group_name = plan.group_name.strip()
            status = plan.status.strip()
            target = plan.target.strip()
            if not group_name or not status or not target:
                raise HTTPException(status_code=400, detail="组别、状态、目标不能为空")
            conn.execute(
                """
                INSERT INTO season_plan (
                    id, season_year, month, group_name, status, target,
                    display_order, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(season_year, month, group_name) DO UPDATE SET
                    status = excluded.status,
                    target = excluded.target,
                    display_order = excluded.display_order,
                    updated_at = excluded.updated_at
                """,
                (
                    uuid.uuid4().hex,
                    season_year,
                    month,
                    group_name,
                    status,
                    target,
                    index,
                    timestamp,
                    timestamp,
                ),
            )
    return list_season_plan(season_year, month)


class LoginRequest(BaseModel):
    password: str
    role: str = "admin"


class SiteAccountProfile(BaseModel):
    full_name: str = ""
    gender: str = ""
    grade: str = ""
    member_status: str = ""
    department: str = ""
    phone: str = ""
    email: str = ""
    bio: str = ""


class SiteAccountRequest(BaseModel):
    account: str
    password: str


class SiteAccountRegisterRequest(SiteAccountRequest, SiteAccountProfile):
    pass


class ForumPostCreateRequest(BaseModel):
    title: str
    content: str
    author_account: str


class ForumReplyCreateRequest(BaseModel):
    content: str
    author_account: str


class SeasonPlanItem(BaseModel):
    group_name: str
    status: str
    target: str


class SeasonPlanRequest(BaseModel):
    season_year: int
    month: int
    plans: list[SeasonPlanItem]


class RowIdsRequest(BaseModel):
    row_ids: list[str]
    note: str = ""


class ReimburseRequest(BaseModel):
    record_ids: list[str]


class AgentThread:
    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._loop, daemon=True, name="local-review")

    def start(self) -> None:
        if not self._thread.is_alive():
            self._thread.start()

    def _loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                run_agent_once()
            except Exception as exc:  # noqa: BLE001
                log_process("local_review", "error", f"后台任务异常：{exc}")
            self._stop_event.wait(AGENT_INTERVAL_SECONDS)


init_db()
agent_thread = AgentThread()
agent_thread.start()

app = FastAPI(title="PRINTK 团队门户 API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in FRONTEND_ORIGIN.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": now_iso()}


@app.post("/api/site-accounts/register")
def register_site_account(payload: SiteAccountRegisterRequest) -> dict[str, str]:
    account = normalize_account(payload.account)
    password = validate_site_password(payload.password)
    profile = normalize_site_profile(payload)
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT account FROM site_account WHERE account = ?", (account,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="账号已存在")
        conn.execute(
            """
            INSERT INTO site_account (
                account, password_hash, full_name, gender, grade, member_status,
                department, phone, email, bio, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                account,
                hash_site_password(password),
                profile["full_name"],
                profile["gender"],
                profile["grade"],
                profile["member_status"],
                profile["department"],
                profile["phone"],
                profile["email"],
                profile["bio"],
                timestamp,
                timestamp,
            ),
        )
    return {"account": account}


@app.post("/api/site-accounts/login")
def login_site_account(payload: SiteAccountRequest) -> dict[str, str]:
    account = normalize_account(payload.account)
    with db_connection() as conn:
        row = conn.execute("SELECT password_hash FROM site_account WHERE account = ?", (account,)).fetchone()
    if not row or not verify_site_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    return {"account": account}


@app.get("/api/site-accounts/{account}")
def get_site_account(account: str) -> dict[str, str]:
    normalized_account = normalize_account(account)
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="账号不存在")
    return site_account_response(row)


@app.put("/api/site-accounts/{account}")
def update_site_account(account: str, payload: SiteAccountProfile) -> dict[str, str]:
    normalized_account = normalize_account(account)
    profile = normalize_site_profile(payload)
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT account FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="账号不存在")
        conn.execute(
            """
            UPDATE site_account
            SET full_name = ?, gender = ?, grade = ?, member_status = ?,
                department = ?, phone = ?, email = ?, bio = ?, updated_at = ?
            WHERE account = ?
            """,
            (
                profile["full_name"],
                profile["gender"],
                profile["grade"],
                profile["member_status"],
                profile["department"],
                profile["phone"],
                profile["email"],
                profile["bio"],
                timestamp,
                normalized_account,
            ),
        )
        row = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    return site_account_response(row)


@app.get("/api/forum/posts")
def list_forum_posts() -> dict[str, Any]:
    with db_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                post.*,
                account.full_name,
                COUNT(reply.id) AS reply_count
            FROM forum_post AS post
            LEFT JOIN site_account AS account ON account.account = post.author_account
            LEFT JOIN forum_reply AS reply ON reply.post_id = post.id
            GROUP BY post.id
            ORDER BY post.created_at DESC
            LIMIT 100
            """
        ).fetchall()
    return {"posts": [forum_post_response(row) for row in rows]}


@app.post("/api/forum/posts")
def create_forum_post(payload: ForumPostCreateRequest) -> dict[str, Any]:
    title = normalize_forum_title(payload.title)
    content = normalize_forum_content(payload.content)
    timestamp = now_iso()
    post_id = uuid.uuid4().hex
    with db_connection() as conn:
        author_account = ensure_forum_author(conn, payload.author_account)
        conn.execute(
            """
            INSERT INTO forum_post (id, title, content, author_account, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (post_id, title, content, author_account, timestamp, timestamp),
        )
        row = conn.execute(
            """
            SELECT post.*, account.full_name, 0 AS reply_count
            FROM forum_post AS post
            LEFT JOIN site_account AS account ON account.account = post.author_account
            WHERE post.id = ?
            """,
            (post_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="帖子创建失败")
    return forum_post_response(row)


@app.get("/api/forum/posts/{post_id}")
def get_forum_post(post_id: str) -> dict[str, Any]:
    with db_connection() as conn:
        post = conn.execute(
            """
            SELECT
                post.*,
                account.full_name,
                COUNT(reply.id) AS reply_count
            FROM forum_post AS post
            LEFT JOIN site_account AS account ON account.account = post.author_account
            LEFT JOIN forum_reply AS reply ON reply.post_id = post.id
            WHERE post.id = ?
            GROUP BY post.id
            """,
            (post_id,),
        ).fetchone()
        if post is None:
            raise HTTPException(status_code=404, detail="帖子不存在")
        replies = conn.execute(
            """
            SELECT reply.*, account.full_name
            FROM forum_reply AS reply
            LEFT JOIN site_account AS account ON account.account = reply.author_account
            WHERE reply.post_id = ?
            ORDER BY reply.created_at ASC
            """,
            (post_id,),
        ).fetchall()
    return {
        "post": forum_post_response(post),
        "replies": [forum_reply_response(row) for row in replies],
    }


@app.post("/api/forum/posts/{post_id}/replies")
def create_forum_reply(post_id: str, payload: ForumReplyCreateRequest) -> dict[str, str]:
    content = normalize_forum_content(payload.content, "回复", 2000)
    timestamp = now_iso()
    reply_id = uuid.uuid4().hex
    with db_connection() as conn:
        author_account = ensure_forum_author(conn, payload.author_account)
        post = conn.execute("SELECT id FROM forum_post WHERE id = ?", (post_id,)).fetchone()
        if post is None:
            raise HTTPException(status_code=404, detail="帖子不存在")
        conn.execute(
            """
            INSERT INTO forum_reply (id, post_id, content, author_account, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (reply_id, post_id, content, author_account, timestamp),
        )
        conn.execute("UPDATE forum_post SET updated_at = ? WHERE id = ?", (timestamp, post_id))
    return {"id": reply_id, "post_id": post_id}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict[str, str]:
    if payload.role == "group_leader" and payload.password == GROUP_LEADER_PASSWORD:
        return {"token": make_token("group_leader"), "role": "group_leader"}
    if payload.role == "admin" and payload.password == ADMIN_PASSWORD:
        return {"token": make_token("admin"), "role": "admin"}
    raise HTTPException(status_code=401, detail="密码错误")


@app.get("/api/season-plan")
def get_season_plan(season_year: int = 2026, month: int = 6) -> dict[str, Any]:
    return {
        "season_year": season_year,
        "month": month,
        "plans": list_season_plan(season_year, month),
    }


@app.put("/api/season-plan")
def update_season_plan(
    payload: SeasonPlanRequest,
    _: str = Depends(require_plan_editor),
) -> dict[str, Any]:
    return {
        "season_year": payload.season_year,
        "month": payload.month,
        "plans": save_season_plan(payload.season_year, payload.month, payload.plans),
    }


@app.post("/api/invoices/upload")
async def upload_invoice_form(
    team_name: str = Form(...),
    submitter_name: str = Form(...),
    submitter_id: str = Form(...),
    remark: str = Form(""),
    form_file: UploadFile = File(...),
) -> dict[str, str]:
    if not team_name.strip() or not submitter_name.strip() or not submitter_id.strip():
        raise HTTPException(status_code=400, detail="团队名称、提交人姓名、提交人编号不能为空")
    if not form_file.filename or Path(form_file.filename).suffix.lower() != ".xlsx":
        raise HTTPException(status_code=400, detail="只支持上传 .xlsx 表格")
    content = await form_file.read()
    if len(content) > MAX_CONTENT_LENGTH:
        raise HTTPException(status_code=413, detail="文件超过 50MB 上限")

    batch_id = build_batch_id(submitter_id)
    batch_dir = UNREGISTERED_DIR / batch_id
    batch_dir.mkdir(parents=True, exist_ok=True)
    target_path = batch_dir / "form.xlsx"
    target_path.write_bytes(content)
    submitted_at = now_iso()
    write_meta(
        batch_dir,
        {
            "batch_id": batch_id,
            "team_name": team_name,
            "submitter_name": submitter_name,
            "submitter_id": submitter_id,
            "submitted_at": submitted_at,
            "form_file": "form.xlsx",
            "remark": remark,
            "folder_stage": "unregistered",
        },
    )
    with db_connection() as conn:
        conn.execute(
            """
            INSERT INTO upload_batch (
                id, team_name, submitter_name, submitter_id, submitted_at,
                form_file_path, remark, status, folder_stage, review_note, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (batch_id, team_name, submitter_name, submitter_id, submitted_at, str(target_path), remark, "unregistered", "unregistered", "", submitted_at, submitted_at),
        )
    log_process("upload", "info", "上传成功，等待本地审核脚本处理", batch_id)
    return {"batch_id": batch_id, "message": "上传成功"}


@app.get("/api/invoices/template")
def download_template() -> StreamingResponse:
    stream = build_template_workbook()
    filename = "采购表格模板.xlsx"
    encoded_filename = quote(filename)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"},
    )


@app.get("/api/invoices/dashboard")
def get_dashboard(_: str = Depends(require_admin)) -> dict[str, Any]:
    return dashboard_data()


@app.post("/api/invoices/review/run")
def run_review(_: str = Depends(require_admin)) -> dict[str, int]:
    return {"processed": run_agent_once()}


@app.get("/api/invoices/batches/{batch_id}")
def get_batch_detail(batch_id: str, _: str = Depends(require_admin)) -> dict[str, Any]:
    with db_connection() as conn:
        batch = conn.execute("SELECT * FROM upload_batch WHERE id = ?", (batch_id,)).fetchone()
        if batch is None:
            raise HTTPException(status_code=404, detail="批次不存在")
        rows = conn.execute("SELECT * FROM staged_purchase_record WHERE batch_id = ? ORDER BY row_no ASC", (batch_id,)).fetchall()
    return {"batch": row_to_dict(batch), "rows": [row_to_dict(row) for row in rows]}


@app.post("/api/invoices/batches/{batch_id}/confirm-selected")
def confirm_selected(batch_id: str, payload: RowIdsRequest, _: str = Depends(require_admin)) -> dict[str, int]:
    return {"count": confirm_staged_rows(batch_id, payload.row_ids)}


@app.post("/api/invoices/batches/{batch_id}/confirm-all")
def confirm_all(batch_id: str, _: str = Depends(require_admin)) -> dict[str, int]:
    with db_connection() as conn:
        rows = conn.execute(
            "SELECT id FROM staged_purchase_record WHERE batch_id = ? AND review_status = 'pending_review'",
            (batch_id,),
        ).fetchall()
    return {"count": confirm_staged_rows(batch_id, [row["id"] for row in rows])}


@app.post("/api/invoices/batches/{batch_id}/reject-selected")
def reject_selected(batch_id: str, payload: RowIdsRequest, _: str = Depends(require_admin)) -> dict[str, int]:
    note = payload.note.strip() or "人工复核未通过"
    return {"count": reject_staged_rows(batch_id, payload.row_ids, note)}


@app.post("/api/invoices/batches/{batch_id}/complete")
def complete_batch(batch_id: str, _: str = Depends(require_admin)) -> dict[str, Any]:
    success, message = finalize_batch_review(batch_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"message": message}


@app.post("/api/invoices/reimburse")
def reimburse(payload: ReimburseRequest, _: str = Depends(require_admin)) -> dict[str, str]:
    success, message = export_reimbursement(payload.record_ids)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"reimbursement_id": message, "message": "出库完成"}


@app.get("/api/invoices/forms/{batch_id}")
def download_form(batch_id: str, _: str = Depends(require_admin)) -> FileResponse:
    with db_connection() as conn:
        batch = conn.execute("SELECT * FROM upload_batch WHERE id = ?", (batch_id,)).fetchone()
    if batch is None:
        raise HTTPException(status_code=404, detail="批次不存在")
    path = Path(batch["form_file_path"])
    if not path.exists():
        path = batch_form_path(batch_id, batch["folder_stage"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="表格文件不存在")
    return FileResponse(path, filename=f"{batch_id}.xlsx")


@app.get("/api/invoices/reimbursements/{reimbursement_id}")
def download_reimbursement(reimbursement_id: str, _: str = Depends(require_admin)) -> FileResponse:
    with db_connection() as conn:
        batch = conn.execute("SELECT * FROM reimbursement_batch WHERE id = ?", (reimbursement_id,)).fetchone()
    if batch is None:
        raise HTTPException(status_code=404, detail="出库批次不存在")
    path = Path(batch["export_file_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="导出文件不存在")
    return FileResponse(path, filename=f"{reimbursement_id}.xlsx")
