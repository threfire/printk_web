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

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from openpyxl import Workbook, load_workbook
from pydantic import BaseModel


PROJECT_ROOT = Path(__file__).resolve().parents[2]
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", PROJECT_ROOT / "storage")).resolve()
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
SITE_MEDIA_DIR = STORAGE_DIR / "site_media"

MAX_CONTENT_LENGTH = 50 * 1024 * 1024
AGENT_INTERVAL_SECONDS = int(os.getenv("AGENT_INTERVAL_SECONDS", "300"))
SECRET_KEY = os.getenv("SECRET_KEY", "material-agent-secret")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "wrprintk")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:3000,http://localhost:3000")
AGENT_LOCK = threading.Lock()
FORUM_PUBLIC_STATUS = "approved"
FORUM_CONTENT_STATUSES = {"pending", "approved", "rejected", "hidden"}
HOME_ASSET_KINDS = {"video", "image"}
HOME_VIDEO_MIME_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
HOME_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DANMAKU_TRACKS = 7
DANMAKU_COLORS = ["#ffffff", "#ffc857", "#37a9ff", "#32d583", "#ff8a9a"]

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
        SITE_MEDIA_DIR,
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
                group_name TEXT DEFAULT '',
                robot_type TEXT NOT NULL,
                task_title TEXT NOT NULL,
                status TEXT NOT NULL,
                target TEXT NOT NULL,
                assignee_account TEXT DEFAULT '',
                is_completed INTEGER NOT NULL DEFAULT 0,
                display_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
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
                reward_score INTEGER NOT NULL DEFAULT 0,
                image2_allowed INTEGER NOT NULL DEFAULT 0,
                is_disabled INTEGER NOT NULL DEFAULT 0,
                admin_note TEXT DEFAULT '',
                last_login_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS site_account_admin_log (
                id TEXT PRIMARY KEY,
                account TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (account) REFERENCES site_account(account)
            );

            CREATE TABLE IF NOT EXISTS forum_post (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author_account TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'approved',
                reject_reason TEXT DEFAULT '',
                reviewed_by TEXT DEFAULT '',
                reviewed_at TEXT DEFAULT '',
                deleted_at TEXT DEFAULT '',
                is_pinned INTEGER NOT NULL DEFAULT 0,
                is_locked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (author_account) REFERENCES site_account(account)
            );

            CREATE TABLE IF NOT EXISTS forum_reply (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                content TEXT NOT NULL,
                author_account TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'approved',
                reject_reason TEXT DEFAULT '',
                reviewed_by TEXT DEFAULT '',
                reviewed_at TEXT DEFAULT '',
                deleted_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES forum_post(id),
                FOREIGN KEY (author_account) REFERENCES site_account(account)
            );

            CREATE TABLE IF NOT EXISTS homepage_asset (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                url TEXT NOT NULL,
                storage_path TEXT DEFAULT '',
                original_filename TEXT DEFAULT '',
                mime_type TEXT DEFAULT '',
                size_bytes INTEGER NOT NULL DEFAULT 0,
                alt TEXT DEFAULT '',
                display_order INTEGER NOT NULL DEFAULT 0,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS homepage_quote (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                source TEXT DEFAULT '',
                display_order INTEGER NOT NULL DEFAULT 0,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS homepage_danmaku (
                id TEXT PRIMARY KEY,
                image_src TEXT NOT NULL,
                author_account TEXT DEFAULT '',
                author_name TEXT DEFAULT '',
                text TEXT NOT NULL,
                track INTEGER NOT NULL,
                color TEXT NOT NULL,
                created_at_ms INTEGER NOT NULL,
                duration REAL NOT NULL,
                delay REAL NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_season_plan_period
            ON season_plan (season_year, month, display_order);

            CREATE INDEX IF NOT EXISTS idx_forum_post_created_at
            ON forum_post (created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_forum_reply_post_created_at
            ON forum_reply (post_id, created_at);

            """
        )
        ensure_season_plan_schema(conn)
        ensure_site_account_profile_columns(conn)
        ensure_homepage_danmaku_columns(conn)
        ensure_forum_moderation_columns(conn)
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_forum_post_status_created_at
            ON forum_post (status, deleted_at, is_pinned, created_at DESC)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_forum_reply_status_created_at
            ON forum_reply (status, deleted_at, created_at DESC)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_site_account_member_status
            ON site_account (member_status, image2_allowed, is_disabled)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_site_account_reward_ranking
            ON site_account (member_status, is_disabled, reward_score DESC, updated_at DESC)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_site_account_admin_log_account
            ON site_account_admin_log (account, created_at DESC)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_homepage_asset_kind_order
            ON homepage_asset (kind, is_enabled, display_order, created_at)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_homepage_quote_order
            ON homepage_quote (is_enabled, display_order, created_at)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_homepage_danmaku_image_created
            ON homepage_danmaku (image_src, created_at_ms)
            """
        )
        seed_season_plan(conn)
        seed_homepage_content(conn)


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
        ("英雄兵种", "云台与发射联调", "准备中", "完成云台通信、发射链路和赛前检查清单。"),
        ("步兵兵种", "底盘功率控制", "准备中", "完成底盘通信、功率管理和基础控制联调。"),
        ("工程兵种", "机构方案验证", "准备中", "完成关键机构方案评审和第一轮装配验证。"),
        ("哨兵兵种", "自动导航测试", "准备中", "完成自动导航、策略接口和仿真数据整理。"),
    ]
    timestamp = now_iso()
    conn.executemany(
        """
        INSERT INTO season_plan (
            id, season_year, month, group_name, robot_type, task_title, status, target,
            assignee_account, is_completed, display_order, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 0, ?, ?, ?)
        """,
        [
            (uuid.uuid4().hex, 2026, 6, f"{robot_type}：{task_title}", robot_type, task_title, status, target, index, timestamp, timestamp)
            for index, (robot_type, task_title, status, target) in enumerate(plans, start=1)
        ],
    )


HOME_IMAGE_SEEDS = [
    ("/home-carousel/team-01.jpeg", "PRINTK 成员在实验室演示康复机器人设备"),
    ("/home-carousel/team-02.jpeg", "PRINTK 队员在赛事现场交流"),
    ("/home-carousel/team-03.jpeg", "PRINTK 队员在场馆内讨论比赛细节"),
    ("/home-carousel/team-04.jpeg", "PRINTK 成员在赛场调试机器人"),
    ("/home-carousel/team-05.jpeg", "PRINTK 队员在比赛现场观察机器人状态"),
    ("/home-carousel/team-06.jpeg", "PRINTK 队员在场边关注比赛进程"),
    ("/home-carousel/team-07.jpeg", "PRINTK 成员在场馆通道集合"),
    ("/home-carousel/team-08.png", "PRINTK 战队赛季全员合影"),
    ("/home-carousel/team-09.jpg", "PRINTK 战队在 RoboMaster 现场合影"),
    ("/home-carousel/team-10.jpg", "PRINTK 成员围绕机器人开展线下交流"),
    ("/home-carousel/team-11.jpg", "PRINTK 队员围绕电脑集中讨论调试方案"),
    ("/home-carousel/team-12.jpeg", "PRINTK 战队与机器人在赛场内合影留念"),
    ("/home-carousel/team-13.jpeg", "PRINTK 队员在比赛现场近距离调试机器人"),
]

HOME_QUOTE_SEEDS = [
    ("道阻且长，行则将至", "PRINTK 赛季口号"),
    ("为青春赋予荣耀，让思考拥有力量", "RoboMaster 赛事理念"),
    ("服务全球青年工程师成为追求极致、有实干精神的梦想家", "RoboMaster 高校系列赛"),
    ("崇尚科学与创新，擅于反思，勇于实践，热爱分享", "RoboMaster 赛事理念"),
    ("初心高于胜负，每一份努力都值得被肯定", "RoboMaster 组织奖文化"),
    ("以学术价值为根基，培养具有工程思维、拥有实干精神的综合素质人才", "RoboMaster 赛事愿景"),
    ("勇于创新、追求极致、崇尚实干、具备视野和远见", "RoboMaster 专属招聘通道"),
]


def seed_homepage_content(conn: sqlite3.Connection) -> None:
    timestamp = now_iso()
    video_count = conn.execute("SELECT COUNT(*) AS total FROM homepage_asset WHERE kind = 'video'").fetchone()["total"]
    if video_count == 0:
        conn.execute(
            """
            INSERT INTO homepage_asset (
                id, kind, url, original_filename, mime_type, size_bytes, alt,
                display_order, is_enabled, created_at, updated_at
            )
            VALUES (?, 'video', ?, ?, 'video/mp4', ?, ?, 1, 1, ?, ?)
            """,
            (uuid.uuid4().hex, "/season-promo.mp4", "欢送老登之夜.mp4", 6233758, "赛季宣传视频", timestamp, timestamp),
        )

    image_count = conn.execute("SELECT COUNT(*) AS total FROM homepage_asset WHERE kind = 'image'").fetchone()["total"]
    if image_count == 0:
        conn.executemany(
            """
            INSERT INTO homepage_asset (
                id, kind, url, original_filename, mime_type, size_bytes, alt,
                display_order, is_enabled, created_at, updated_at
            )
            VALUES (?, 'image', ?, ?, '', 0, ?, ?, 1, ?, ?)
            """,
            [
                (uuid.uuid4().hex, url, Path(url).name, alt, index, timestamp, timestamp)
                for index, (url, alt) in enumerate(HOME_IMAGE_SEEDS, start=1)
            ],
        )

    quote_count = conn.execute("SELECT COUNT(*) AS total FROM homepage_quote").fetchone()["total"]
    if quote_count == 0:
        conn.executemany(
            """
            INSERT INTO homepage_quote (
                id, text, source, display_order, is_enabled, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, 1, ?, ?)
            """,
            [
                (uuid.uuid4().hex, text, source, index, timestamp, timestamp)
                for index, (text, source) in enumerate(HOME_QUOTE_SEEDS, start=1)
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


def ensure_season_plan_schema(conn: sqlite3.Connection) -> None:
    existing_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(season_plan)").fetchall()
    }
    column_definitions = {
        "group_name": "TEXT DEFAULT ''",
        "robot_type": "TEXT NOT NULL DEFAULT ''",
        "task_title": "TEXT NOT NULL DEFAULT ''",
        "assignee_account": "TEXT DEFAULT ''",
        "is_completed": "INTEGER NOT NULL DEFAULT 0",
    }
    for column, definition in column_definitions.items():
        if column not in existing_columns:
            conn.execute(f"ALTER TABLE season_plan ADD COLUMN {column} {definition}")

    if "group_name" in existing_columns:
        conn.execute(
            """
            UPDATE season_plan
            SET robot_type = COALESCE(NULLIF(robot_type, ''), group_name),
                task_title = COALESCE(NULLIF(task_title, ''), target)
            WHERE COALESCE(robot_type, '') = '' OR COALESCE(task_title, '') = ''
            """
        )


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
        "reward_score": "INTEGER NOT NULL DEFAULT 0",
        "image2_allowed": "INTEGER NOT NULL DEFAULT 0",
        "is_disabled": "INTEGER NOT NULL DEFAULT 0",
        "admin_note": "TEXT DEFAULT ''",
        "last_login_at": "TEXT DEFAULT ''",
    }
    for column, definition in profile_columns.items():
        if column not in existing_columns:
            conn.execute(f"ALTER TABLE site_account ADD COLUMN {column} {definition}")
    conn.execute(
        """
        UPDATE site_account
        SET reward_score = 0
        WHERE member_status NOT IN ('正式队员', '老队员')
            AND COALESCE(reward_score, 0) <> 0
        """
    )


def ensure_forum_moderation_columns(conn: sqlite3.Connection) -> None:
    post_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(forum_post)").fetchall()
    }
    post_definitions = {
        "status": "TEXT NOT NULL DEFAULT 'approved'",
        "reject_reason": "TEXT DEFAULT ''",
        "reviewed_by": "TEXT DEFAULT ''",
        "reviewed_at": "TEXT DEFAULT ''",
        "deleted_at": "TEXT DEFAULT ''",
        "is_pinned": "INTEGER NOT NULL DEFAULT 0",
        "is_locked": "INTEGER NOT NULL DEFAULT 0",
    }
    for column, definition in post_definitions.items():
        if column not in post_columns:
            conn.execute(f"ALTER TABLE forum_post ADD COLUMN {column} {definition}")

    reply_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(forum_reply)").fetchall()
    }
    reply_definitions = {
        "status": "TEXT NOT NULL DEFAULT 'approved'",
        "reject_reason": "TEXT DEFAULT ''",
        "reviewed_by": "TEXT DEFAULT ''",
        "reviewed_at": "TEXT DEFAULT ''",
        "deleted_at": "TEXT DEFAULT ''",
    }
    for column, definition in reply_definitions.items():
        if column not in reply_columns:
            conn.execute(f"ALTER TABLE forum_reply ADD COLUMN {column} {definition}")


def ensure_homepage_danmaku_columns(conn: sqlite3.Connection) -> None:
    existing_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(homepage_danmaku)").fetchall()
    }
    column_definitions = {
        "author_account": "TEXT DEFAULT ''",
        "author_name": "TEXT DEFAULT ''",
    }
    for column, definition in column_definitions.items():
        if column not in existing_columns:
            conn.execute(f"ALTER TABLE homepage_danmaku ADD COLUMN {column} {definition}")

    conn.execute(
        """
        UPDATE homepage_danmaku
        SET author_name = COALESCE(
            NULLIF(author_name, ''),
            NULLIF((SELECT full_name FROM site_account WHERE site_account.account = homepage_danmaku.author_account), ''),
            author_account,
            ''
        )
        WHERE COALESCE(author_name, '') = ''
        """
    )


GENDER_OPTIONS = {"", "男", "女", "其他"}
GRADE_OPTIONS = {"", "大一", "大二", "大三", "大四", "研究生"}
PLAN_EDITOR_STATUS_OPTIONS = {"兵种组长", "队长", "管理员", "老师"}
MEMBER_STATUS_OPTIONS = {"", "非战队队员", "梯队队员", "正式队员", "兵种组长", "队长", "管理员", "老队员", "退役队员", "老师"}
REWARD_STATUS_OPTIONS = {"正式队员", "老队员"}
DEPARTMENT_OPTIONS = {"", "电控", "机械", "算法", "运营"}
SEASON_PLAN_ROBOT_TYPES = {"英雄兵种", "步兵兵种", "工程兵种", "哨兵兵种"}


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


def reward_eligible(member_status: str) -> bool:
    return member_status in REWARD_STATUS_OPTIONS


def normalize_reward_score(value: int) -> int:
    if value < 0:
        raise HTTPException(status_code=400, detail="奖励分不能小于 0")
    if value > 999999:
        raise HTTPException(status_code=400, detail="奖励分不能超过 999999")
    return value


def site_account_response(row: sqlite3.Row, include_admin: bool = False) -> dict[str, Any]:
    eligible = reward_eligible(row["member_status"] or "")
    data = {
        "account": row["account"],
        "full_name": row["full_name"] or "",
        "gender": row["gender"] or "",
        "grade": row["grade"] or "",
        "member_status": row["member_status"] or "",
        "department": row["department"] or "",
        "phone": row["phone"] or "",
        "email": row["email"] or "",
        "bio": row["bio"] or "",
        "reward_score": row["reward_score"] if eligible else 0,
        "reward_eligible": eligible,
        "image2_allowed": bool(row["image2_allowed"]),
        "is_disabled": bool(row["is_disabled"]),
        "last_login_at": row["last_login_at"] or "",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if include_admin:
        data["admin_note"] = row["admin_note"] or ""
    return data


def account_admin_log(conn: sqlite3.Connection, account: str, action: str, detail: str = "") -> None:
    timestamp = now_iso()
    conn.execute(
        """
        INSERT INTO site_account_admin_log (id, account, action, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (uuid.uuid4().hex, account, action, detail, timestamp),
    )


def forum_author_name(row: sqlite3.Row) -> str:
    return row["full_name"] or row["author_account"]


def forum_post_response(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "author_account": row["author_account"],
        "author_name": forum_author_name(row),
        "status": row["status"] if "status" in row.keys() else FORUM_PUBLIC_STATUS,
        "reject_reason": row["reject_reason"] if "reject_reason" in row.keys() else "",
        "reviewed_by": row["reviewed_by"] if "reviewed_by" in row.keys() else "",
        "reviewed_at": row["reviewed_at"] if "reviewed_at" in row.keys() else "",
        "deleted_at": row["deleted_at"] if "deleted_at" in row.keys() else "",
        "is_pinned": bool(row["is_pinned"]) if "is_pinned" in row.keys() else False,
        "is_locked": bool(row["is_locked"]) if "is_locked" in row.keys() else False,
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
        "status": row["status"] if "status" in row.keys() else FORUM_PUBLIC_STATUS,
        "reject_reason": row["reject_reason"] if "reject_reason" in row.keys() else "",
        "reviewed_by": row["reviewed_by"] if "reviewed_by" in row.keys() else "",
        "reviewed_at": row["reviewed_at"] if "reviewed_at" in row.keys() else "",
        "deleted_at": row["deleted_at"] if "deleted_at" in row.keys() else "",
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
    row = conn.execute("SELECT account, is_disabled FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="账号不存在，请重新登录")
    if row["is_disabled"]:
        raise HTTPException(status_code=403, detail="账号已停用，请联系管理员")
    return normalized_account


def normalize_forum_status(value: str) -> str:
    status = value.strip()
    if status not in FORUM_CONTENT_STATUSES:
        raise HTTPException(status_code=400, detail="论坛状态格式错误")
    return status


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


def require_site_plan_editor(payload: "SeasonPlanRequest") -> str:
    account = normalize_account(payload.editor_account)
    with db_connection() as conn:
        row = conn.execute(
            "SELECT account, member_status, is_disabled FROM site_account WHERE account = ?",
            (account,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="请先登录账号")
    if row["is_disabled"]:
        raise HTTPException(status_code=403, detail="账号已停用，请联系管理员")
    if row["member_status"] not in PLAN_EDITOR_STATUS_OPTIONS:
        raise HTTPException(status_code=403, detail="当前账号没有赛季规划编辑权限")
    return account


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
    sheet.title = "发票模板"
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
            SELECT
                id, season_year, month, robot_type, task_title, status, target,
                assignee_account, is_completed, display_order, updated_at
            FROM season_plan
            WHERE season_year = ? AND month = ?
                AND robot_type IN ('英雄兵种', '步兵兵种', '工程兵种', '哨兵兵种')
            ORDER BY display_order ASC, robot_type ASC, task_title ASC
            """,
            (season_year, month),
        ).fetchall()
    plans = []
    for row in rows:
        plan = row_to_dict(row)
        plan["is_completed"] = bool(plan["is_completed"])
        plans.append(plan)
    return plans


def save_season_plan(season_year: int, month: int, plans: list["SeasonPlanItem"]) -> list[dict[str, Any]]:
    validate_plan_period(season_year, month)
    if not plans:
        raise HTTPException(status_code=400, detail="计划不能为空")
    timestamp = now_iso()
    with db_connection() as conn:
        conn.execute("DELETE FROM season_plan WHERE season_year = ? AND month = ?", (season_year, month))
        for index, plan in enumerate(plans, start=1):
            robot_type = plan.robot_type.strip()
            task_title = plan.task_title.strip()
            status = plan.status.strip()
            target = plan.target.strip()
            assignee_account = plan.assignee_account.strip()
            if robot_type not in SEASON_PLAN_ROBOT_TYPES:
                raise HTTPException(status_code=400, detail="兵种格式错误")
            if not task_title or not status or not target:
                raise HTTPException(status_code=400, detail="兵种、任务、状态、目标不能为空")
            if assignee_account:
                assignee = conn.execute(
                    "SELECT account, is_disabled FROM site_account WHERE account = ?",
                    (assignee_account,),
                ).fetchone()
                if assignee is None:
                    raise HTTPException(status_code=400, detail=f"执行人账号不存在：{assignee_account}")
                if assignee["is_disabled"]:
                    raise HTTPException(status_code=400, detail=f"执行人账号已停用：{assignee_account}")
            conn.execute(
                """
                INSERT INTO season_plan (
                    id, season_year, month, group_name, robot_type, task_title, status, target,
                    assignee_account, is_completed, display_order, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uuid.uuid4().hex,
                    season_year,
                    month,
                    f"{robot_type}：{task_title}",
                    robot_type,
                    task_title,
                    status,
                    target,
                    assignee_account,
                    1 if plan.is_completed else 0,
                    index,
                    timestamp,
                    timestamp,
                ),
            )
    return list_season_plan(season_year, month)


def homepage_asset_response(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "kind": row["kind"],
        "url": row["url"],
        "original_filename": row["original_filename"] or "",
        "mime_type": row["mime_type"] or "",
        "size_bytes": row["size_bytes"] or 0,
        "alt": row["alt"] or "",
        "display_order": row["display_order"] or 0,
        "is_enabled": bool(row["is_enabled"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def homepage_quote_response(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "text": row["text"],
        "source": row["source"] or "",
        "display_order": row["display_order"] or 0,
        "is_enabled": bool(row["is_enabled"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def homepage_danmaku_response(row: sqlite3.Row) -> dict[str, Any]:
    author_name = row["author_name"] if "author_name" in row.keys() else ""
    author_account = row["author_account"] if "author_account" in row.keys() else ""
    account_full_name = row["account_full_name"] if "account_full_name" in row.keys() else ""
    return {
        "id": row["id"],
        "imageSrc": row["image_src"],
        "authorAccount": author_account,
        "authorName": author_name or account_full_name or author_account,
        "text": row["text"],
        "track": row["track"],
        "color": row["color"],
        "createdAt": row["created_at_ms"],
        "duration": row["duration"],
        "delay": row["delay"],
    }


def get_homepage_content(include_disabled: bool = False) -> dict[str, Any]:
    enabled_clause = "" if include_disabled else "AND is_enabled = 1"
    with db_connection() as conn:
        videos = conn.execute(
            f"""
            SELECT *
            FROM homepage_asset
            WHERE kind = 'video' {enabled_clause}
            ORDER BY display_order ASC, created_at DESC
            """
        ).fetchall()
        images = conn.execute(
            f"""
            SELECT *
            FROM homepage_asset
            WHERE kind = 'image' {enabled_clause}
            ORDER BY display_order ASC, created_at ASC
            """
        ).fetchall()
        quotes = conn.execute(
            f"""
            SELECT *
            FROM homepage_quote
            WHERE 1 = 1 {enabled_clause}
            ORDER BY display_order ASC, created_at ASC
            """
        ).fetchall()
    video_items = [homepage_asset_response(row) for row in videos]
    return {
        "video": video_items[0] if video_items else None,
        "videos": video_items,
        "images": [homepage_asset_response(row) for row in images],
        "quotes": [homepage_quote_response(row) for row in quotes],
    }


def normalize_homepage_order(value: int) -> int:
    if value < 0 or value > 9999:
        raise HTTPException(status_code=400, detail="排序值需在 0 到 9999 之间")
    return value


def normalize_homepage_kind(value: str) -> str:
    kind = value.strip()
    if kind not in HOME_ASSET_KINDS:
        raise HTTPException(status_code=400, detail="媒体类型格式错误")
    return kind


def media_url(filename: str) -> str:
    return f"/api/site-media/{quote(filename)}"


async def save_homepage_upload(kind: str, upload: UploadFile, alt: str, display_order: int) -> dict[str, Any]:
    normalized_kind = normalize_homepage_kind(kind)
    if not upload.filename:
        raise HTTPException(status_code=400, detail="请选择上传文件")
    content = await upload.read()
    if len(content) > MAX_CONTENT_LENGTH:
        raise HTTPException(status_code=413, detail="文件超过 50MB 上限")
    mime_type = upload.content_type or ""
    allowed_types = HOME_VIDEO_MIME_TYPES if normalized_kind == "video" else HOME_IMAGE_MIME_TYPES
    if mime_type not in allowed_types:
        raise HTTPException(status_code=400, detail="文件类型不支持")

    suffix = Path(upload.filename).suffix.lower()
    if normalized_kind == "video" and suffix not in {".mp4", ".webm", ".mov"}:
        raise HTTPException(status_code=400, detail="视频只支持 mp4、webm、mov")
    if normalized_kind == "image" and suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise HTTPException(status_code=400, detail="图片只支持 jpg、png、webp、gif")

    timestamp = now_iso()
    media_id = uuid.uuid4().hex
    filename = f"{normalized_kind}-{media_id}{suffix}"
    target_path = SITE_MEDIA_DIR / filename
    target_path.write_bytes(content)
    normalized_alt = normalize_limited_text(alt, "媒体说明", 120)
    normalized_order = normalize_homepage_order(display_order)

    with db_connection() as conn:
        if normalized_kind == "video":
            conn.execute("UPDATE homepage_asset SET is_enabled = 0, updated_at = ? WHERE kind = 'video'", (timestamp,))
        conn.execute(
            """
            INSERT INTO homepage_asset (
                id, kind, url, storage_path, original_filename, mime_type, size_bytes,
                alt, display_order, is_enabled, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                media_id,
                normalized_kind,
                media_url(filename),
                str(target_path),
                upload.filename,
                mime_type,
                len(content),
                normalized_alt,
                normalized_order,
                timestamp,
                timestamp,
            ),
        )
        row = conn.execute("SELECT * FROM homepage_asset WHERE id = ?", (media_id,)).fetchone()
    return homepage_asset_response(row)


def update_homepage_asset(asset_id: str, payload: "HomepageAssetUpdate") -> dict[str, Any]:
    timestamp = now_iso()
    alt = normalize_limited_text(payload.alt, "媒体说明", 120)
    display_order = normalize_homepage_order(payload.display_order)
    with db_connection() as conn:
        existing = conn.execute("SELECT * FROM homepage_asset WHERE id = ?", (asset_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="媒体不存在")
        if existing["kind"] == "video" and payload.is_enabled:
            conn.execute("UPDATE homepage_asset SET is_enabled = 0, updated_at = ? WHERE kind = 'video' AND id <> ?", (timestamp, asset_id))
        conn.execute(
            """
            UPDATE homepage_asset
            SET alt = ?, display_order = ?, is_enabled = ?, updated_at = ?
            WHERE id = ?
            """,
            (alt, display_order, 1 if payload.is_enabled else 0, timestamp, asset_id),
        )
        row = conn.execute("SELECT * FROM homepage_asset WHERE id = ?", (asset_id,)).fetchone()
    return homepage_asset_response(row)


def delete_homepage_asset(asset_id: str) -> dict[str, str]:
    with db_connection() as conn:
        existing = conn.execute("SELECT * FROM homepage_asset WHERE id = ?", (asset_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="媒体不存在")
        conn.execute("DELETE FROM homepage_asset WHERE id = ?", (asset_id,))
    storage_path = existing["storage_path"] or ""
    if storage_path:
        path = Path(storage_path)
        if path.exists() and path.resolve().is_relative_to(SITE_MEDIA_DIR.resolve()):
            path.unlink()
    return {"message": "媒体已删除"}


def create_homepage_quote(payload: "HomepageQuoteCreate") -> dict[str, Any]:
    text = normalize_limited_text(payload.text, "文案", 120)
    if not text:
        raise HTTPException(status_code=400, detail="文案不能为空")
    source = normalize_limited_text(payload.source, "来源", 80)
    display_order = normalize_homepage_order(payload.display_order)
    quote_id = uuid.uuid4().hex
    timestamp = now_iso()
    with db_connection() as conn:
        conn.execute(
            """
            INSERT INTO homepage_quote (
                id, text, source, display_order, is_enabled, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (quote_id, text, source, display_order, 1 if payload.is_enabled else 0, timestamp, timestamp),
        )
        row = conn.execute("SELECT * FROM homepage_quote WHERE id = ?", (quote_id,)).fetchone()
    return homepage_quote_response(row)


def update_homepage_quote(quote_id: str, payload: "HomepageQuoteUpdate") -> dict[str, Any]:
    text = normalize_limited_text(payload.text, "文案", 120)
    if not text:
        raise HTTPException(status_code=400, detail="文案不能为空")
    source = normalize_limited_text(payload.source, "来源", 80)
    display_order = normalize_homepage_order(payload.display_order)
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT id FROM homepage_quote WHERE id = ?", (quote_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="文案不存在")
        conn.execute(
            """
            UPDATE homepage_quote
            SET text = ?, source = ?, display_order = ?, is_enabled = ?, updated_at = ?
            WHERE id = ?
            """,
            (text, source, display_order, 1 if payload.is_enabled else 0, timestamp, quote_id),
        )
        row = conn.execute("SELECT * FROM homepage_quote WHERE id = ?", (quote_id,)).fetchone()
    return homepage_quote_response(row)


def delete_homepage_quote(quote_id: str) -> dict[str, str]:
    with db_connection() as conn:
        existing = conn.execute("SELECT id FROM homepage_quote WHERE id = ?", (quote_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="文案不存在")
        conn.execute("DELETE FROM homepage_quote WHERE id = ?", (quote_id,))
    return {"message": "文案已删除"}


def normalize_danmaku_image_src(value: str) -> str:
    image_src = normalize_limited_text(value, "图片地址", 240)
    if not image_src.startswith(("/", "http://", "https://")):
        raise HTTPException(status_code=400, detail="图片地址格式错误")
    return image_src


def list_homepage_danmaku(image_src: str | None = None) -> dict[str, Any]:
    with db_connection() as conn:
        if image_src:
            rows = conn.execute(
                """
                SELECT
                    danmaku.*,
                    account.full_name AS account_full_name
                FROM homepage_danmaku AS danmaku
                LEFT JOIN site_account AS account
                    ON account.account = danmaku.author_account
                WHERE danmaku.image_src = ?
                ORDER BY created_at_ms ASC
                LIMIT 120
                """,
                (normalize_danmaku_image_src(image_src),),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT
                    danmaku.*,
                    account.full_name AS account_full_name
                FROM homepage_danmaku AS danmaku
                LEFT JOIN site_account AS account
                    ON account.account = danmaku.author_account
                ORDER BY created_at_ms ASC
                LIMIT 600
                """
            ).fetchall()
    return {"messages": [homepage_danmaku_response(row) for row in rows]}


def create_homepage_danmaku(payload: "HomepageDanmakuCreate") -> dict[str, Any]:
    image_src = normalize_danmaku_image_src(payload.imageSrc)
    text = normalize_limited_text(payload.text, "留言弹幕", 48)
    if not text:
        raise HTTPException(status_code=400, detail="留言弹幕不能为空")
    author_account = normalize_account(payload.authorAccount) if payload.authorAccount.strip() else ""

    timestamp = now_iso()
    created_at_ms = int(time.time() * 1000)
    danmaku_id = uuid.uuid4().hex
    with db_connection() as conn:
        author_name = ""
        if author_account:
            account_row = conn.execute(
                "SELECT account, full_name FROM site_account WHERE account = ?",
                (author_account,),
            ).fetchone()
            if account_row is not None:
                author_account = account_row["account"]
                author_name = account_row["full_name"] or account_row["account"]
            else:
                author_name = author_account
        message_count = conn.execute(
            "SELECT COUNT(*) AS total FROM homepage_danmaku WHERE image_src = ?",
            (image_src,),
        ).fetchone()["total"]
        conn.execute(
            """
            INSERT INTO homepage_danmaku (
                id, image_src, author_account, author_name, text, track, color, created_at_ms, duration, delay, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                danmaku_id,
                image_src,
                author_account,
                author_name,
                text,
                message_count % DANMAKU_TRACKS,
                DANMAKU_COLORS[message_count % len(DANMAKU_COLORS)],
                created_at_ms,
                8 + (message_count % 5),
                0,
                timestamp,
            ),
        )
        row = conn.execute("SELECT * FROM homepage_danmaku WHERE id = ?", (danmaku_id,)).fetchone()
    return {"message": homepage_danmaku_response(row)}


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


class Image2AccessRequest(BaseModel):
    image2_allowed: bool


class RewardScoreRequest(BaseModel):
    reward_score: int


class SiteAccountAdminUpdate(SiteAccountProfile):
    reward_score: int = 0
    image2_allowed: bool = False
    is_disabled: bool = False
    admin_note: str = ""


class SiteAccountPasswordResetRequest(BaseModel):
    new_password: str


class ForumPostCreateRequest(BaseModel):
    title: str
    content: str
    author_account: str


class ForumReplyCreateRequest(BaseModel):
    content: str
    author_account: str


class ForumModerationRequest(BaseModel):
    status: str
    reject_reason: str = ""
    is_pinned: bool | None = None
    is_locked: bool | None = None


class SeasonPlanItem(BaseModel):
    robot_type: str
    task_title: str
    status: str
    target: str
    assignee_account: str = ""
    is_completed: bool = False


class SeasonPlanRequest(BaseModel):
    season_year: int
    month: int
    editor_account: str
    plans: list[SeasonPlanItem]


class HomepageAssetUpdate(BaseModel):
    alt: str = ""
    display_order: int = 0
    is_enabled: bool = True


class HomepageQuoteCreate(BaseModel):
    text: str
    source: str = ""
    display_order: int = 0
    is_enabled: bool = True


class HomepageQuoteUpdate(HomepageQuoteCreate):
    pass


class HomepageDanmakuCreate(BaseModel):
    imageSrc: str
    text: str
    authorAccount: str = ""


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


@app.get("/api/homepage")
def homepage_content() -> dict[str, Any]:
    return get_homepage_content(include_disabled=False)


@app.get("/api/homepage/danmaku")
def homepage_danmaku(image_src: str | None = Query(default=None)) -> dict[str, Any]:
    return list_homepage_danmaku(image_src)


@app.post("/api/homepage/danmaku")
def create_homepage_danmaku_route(payload: HomepageDanmakuCreate) -> dict[str, Any]:
    return create_homepage_danmaku(payload)


@app.get("/api/site-media/{filename}")
def get_site_media(filename: str) -> FileResponse:
    path = (SITE_MEDIA_DIR / filename).resolve()
    if not path.is_file() or not path.is_relative_to(SITE_MEDIA_DIR.resolve()):
        raise HTTPException(status_code=404, detail="媒体文件不存在")
    return FileResponse(path)


@app.get("/api/admin/homepage")
def admin_homepage_content(_: str = Depends(require_admin)) -> dict[str, Any]:
    return get_homepage_content(include_disabled=True)


@app.post("/api/admin/homepage/assets")
async def upload_homepage_asset(
    kind: str = Form(...),
    alt: str = Form(""),
    display_order: int = Form(0),
    file: UploadFile = File(...),
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    return await save_homepage_upload(kind, file, alt, display_order)


@app.put("/api/admin/homepage/assets/{asset_id}")
def update_homepage_asset_route(
    asset_id: str,
    payload: HomepageAssetUpdate,
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    return update_homepage_asset(asset_id, payload)


@app.delete("/api/admin/homepage/assets/{asset_id}")
def delete_homepage_asset_route(asset_id: str, _: str = Depends(require_admin)) -> dict[str, str]:
    return delete_homepage_asset(asset_id)


@app.post("/api/admin/homepage/quotes")
def create_homepage_quote_route(
    payload: HomepageQuoteCreate,
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    return create_homepage_quote(payload)


@app.put("/api/admin/homepage/quotes/{quote_id}")
def update_homepage_quote_route(
    quote_id: str,
    payload: HomepageQuoteUpdate,
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    return update_homepage_quote(quote_id, payload)


@app.delete("/api/admin/homepage/quotes/{quote_id}")
def delete_homepage_quote_route(quote_id: str, _: str = Depends(require_admin)) -> dict[str, str]:
    return delete_homepage_quote(quote_id)


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
                department, phone, email, bio, reward_score, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
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
        row = conn.execute("SELECT * FROM site_account WHERE account = ?", (account,)).fetchone()
        if row and not row["is_disabled"] and verify_site_password(payload.password, row["password_hash"]):
            conn.execute(
                "UPDATE site_account SET last_login_at = ?, updated_at = ? WHERE account = ?",
                (now_iso(), now_iso(), account),
            )
            return {"account": account}
    if not row or not verify_site_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    raise HTTPException(status_code=403, detail="账号已停用，请联系管理员")


@app.get("/api/site-accounts/{account}")
def get_site_account(account: str) -> dict[str, Any]:
    normalized_account = normalize_account(account)
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="账号不存在")
    return site_account_response(row)


@app.put("/api/site-accounts/{account}")
def update_site_account(account: str, payload: SiteAccountProfile) -> dict[str, Any]:
    normalized_account = normalize_account(account)
    profile = normalize_site_profile(payload)
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT account, is_disabled FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="账号不存在")
        if existing["is_disabled"]:
            raise HTTPException(status_code=403, detail="账号已停用，请联系管理员")
        conn.execute(
            """
            UPDATE site_account
            SET full_name = ?, gender = ?, grade = ?, member_status = ?,
                department = ?, phone = ?, email = ?, bio = ?,
                reward_score = CASE WHEN ? IN ('正式队员', '老队员') THEN reward_score ELSE 0 END,
                updated_at = ?
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
                profile["member_status"],
                timestamp,
                normalized_account,
            ),
        )
        row = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    return site_account_response(row)


@app.get("/api/admin/site-accounts")
def list_site_accounts(
    keyword: str = Query(default="", max_length=80),
    member_status: str = Query(default=""),
    department: str = Query(default=""),
    state: str = Query(default="all"),
    image2: str = Query(default="all"),
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    normalized_member_status = normalize_choice(member_status, "身份信息", MEMBER_STATUS_OPTIONS)
    normalized_department = normalize_choice(department, "部门信息", DEPARTMENT_OPTIONS)
    normalized_keyword = keyword.strip()
    if state not in {"all", "enabled", "disabled"}:
        raise HTTPException(status_code=400, detail="账号状态格式错误")
    if image2 not in {"all", "allowed", "denied"}:
        raise HTTPException(status_code=400, detail="图片工具权限格式错误")

    where = ["1 = 1"]
    params: list[Any] = []
    if normalized_keyword:
        where.append("(account LIKE ? OR full_name LIKE ? OR phone LIKE ? OR email LIKE ?)")
        like_value = f"%{normalized_keyword}%"
        params.extend([like_value, like_value, like_value, like_value])
    if normalized_member_status:
        where.append("member_status = ?")
        params.append(normalized_member_status)
    if normalized_department:
        where.append("department = ?")
        params.append(normalized_department)
    if state == "enabled":
        where.append("is_disabled = 0")
    if state == "disabled":
        where.append("is_disabled = 1")
    if image2 == "allowed":
        where.append("image2_allowed = 1")
    if image2 == "denied":
        where.append("image2_allowed = 0")

    with db_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT *
            FROM site_account
            WHERE {' AND '.join(where)}
            ORDER BY is_disabled ASC, updated_at DESC, account ASC
            LIMIT 200
            """,
            params,
        ).fetchall()
        summary = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_disabled = 0 THEN 1 ELSE 0 END) AS enabled,
                SUM(CASE WHEN is_disabled = 1 THEN 1 ELSE 0 END) AS disabled,
                SUM(CASE WHEN image2_allowed = 1 THEN 1 ELSE 0 END) AS image2_allowed
            FROM site_account
            """
        ).fetchone()
    return {
        "accounts": [site_account_response(row, include_admin=True) for row in rows],
        "summary": {
            "total": summary["total"] or 0,
            "enabled": summary["enabled"] or 0,
            "disabled": summary["disabled"] or 0,
            "image2_allowed": summary["image2_allowed"] or 0,
        },
    }


@app.put("/api/admin/site-accounts/{account}")
def update_site_account_by_admin(
    account: str,
    payload: SiteAccountAdminUpdate,
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    normalized_account = normalize_account(account)
    profile = normalize_site_profile(payload)
    admin_note = normalize_limited_text(payload.admin_note, "后台备注", 200)
    reward_score = normalize_reward_score(payload.reward_score) if reward_eligible(profile["member_status"]) else 0
    if payload.image2_allowed and profile["member_status"] != "正式队员":
        raise HTTPException(status_code=400, detail="图片工具权限只支持正式队员账号")
    if payload.is_disabled and payload.image2_allowed:
        raise HTTPException(status_code=400, detail="停用账号不能添加图片工具权限")
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT account FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="账号不存在")
        conn.execute(
            """
            UPDATE site_account
            SET full_name = ?, gender = ?, grade = ?, member_status = ?,
                department = ?, phone = ?, email = ?, bio = ?,
                reward_score = ?, image2_allowed = ?, is_disabled = ?, admin_note = ?, updated_at = ?
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
                reward_score,
                1 if payload.image2_allowed else 0,
                1 if payload.is_disabled else 0,
                admin_note,
                timestamp,
                normalized_account,
            ),
        )
        account_admin_log(conn, normalized_account, "update", "管理员更新账号资料")
        updated = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    return site_account_response(updated, include_admin=True)


@app.put("/api/admin/site-accounts/{account}/reward-score")
def update_site_account_reward_score(
    account: str,
    payload: RewardScoreRequest,
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    normalized_account = normalize_account(account)
    reward_score = normalize_reward_score(payload.reward_score)
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute(
            "SELECT account, member_status FROM site_account WHERE account = ?",
            (normalized_account,),
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="账号不存在")
        if not reward_eligible(existing["member_status"] or ""):
            raise HTTPException(status_code=400, detail="该账号身份不支持奖励分")
        conn.execute(
            """
            UPDATE site_account
            SET reward_score = ?, updated_at = ?
            WHERE account = ?
            """,
            (reward_score, timestamp, normalized_account),
        )
        account_admin_log(conn, normalized_account, "reward_score", "管理员更新奖励分")
        updated = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    return site_account_response(updated, include_admin=True)


@app.get("/api/reward-ranking")
def reward_ranking() -> dict[str, Any]:
    with db_connection() as conn:
        rows = conn.execute(
            """
            SELECT account, full_name, member_status, department, reward_score, updated_at
            FROM site_account
            WHERE is_disabled = 0
                AND member_status IN ('正式队员', '老队员')
            ORDER BY reward_score DESC, updated_at ASC, account ASC
            LIMIT 200
            """
        ).fetchall()
    return {
        "ranking": [
            {
                "rank": index,
                "account": row["account"],
                "full_name": row["full_name"] or row["account"],
                "member_status": row["member_status"] or "",
                "department": row["department"] or "",
                "reward_score": row["reward_score"] or 0,
                "updated_at": row["updated_at"] or "",
            }
            for index, row in enumerate(rows, start=1)
        ]
    }


@app.post("/api/admin/site-accounts/{account}/reset-password")
def reset_site_account_password(
    account: str,
    payload: SiteAccountPasswordResetRequest,
    _: str = Depends(require_admin),
) -> dict[str, str]:
    normalized_account = normalize_account(account)
    new_password = validate_site_password(payload.new_password)
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT account FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="账号不存在")
        conn.execute(
            "UPDATE site_account SET password_hash = ?, updated_at = ? WHERE account = ?",
            (hash_site_password(new_password), timestamp, normalized_account),
        )
        account_admin_log(conn, normalized_account, "reset_password", "管理员重置账号密码")
    return {"account": normalized_account, "message": "密码已重置"}


@app.get("/api/admin/site-accounts/image2-access")
def list_image2_access_accounts(_: str = Depends(require_admin)) -> dict[str, Any]:
    with db_connection() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM site_account
            WHERE member_status = ? AND is_disabled = 0
            ORDER BY image2_allowed DESC, updated_at DESC, account ASC
            """,
            ("正式队员",),
        ).fetchall()
    return {"accounts": [site_account_response(row) for row in rows]}


@app.put("/api/admin/site-accounts/{account}/image2-access")
def update_image2_access(
    account: str,
    payload: Image2AccessRequest,
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    normalized_account = normalize_account(account)
    timestamp = now_iso()
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="账号不存在")
        if row["is_disabled"]:
            raise HTTPException(status_code=400, detail="停用账号不能添加图片工具权限")
        if payload.image2_allowed and row["member_status"] != "正式队员":
            raise HTTPException(status_code=400, detail="图片工具权限只支持正式队员账号")
        conn.execute(
            """
            UPDATE site_account
            SET image2_allowed = ?, updated_at = ?
            WHERE account = ?
            """,
            (1 if payload.image2_allowed else 0, timestamp, normalized_account),
        )
        account_admin_log(conn, normalized_account, "image2_access", "管理员更新图片工具权限")
        updated = conn.execute("SELECT * FROM site_account WHERE account = ?", (normalized_account,)).fetchone()
    return site_account_response(updated, include_admin=True)


@app.get("/api/admin/forum")
def list_forum_management(
    status: str = Query(default="all"),
    _: str = Depends(require_admin),
) -> dict[str, Any]:
    status_filter = status.strip()
    if status_filter != "all":
        status_filter = normalize_forum_status(status_filter)
    where_sql = ""
    params: list[Any] = [FORUM_PUBLIC_STATUS]
    if status_filter != "all":
        where_sql = "WHERE post.status = ?"
        params.append(status_filter)
    with db_connection() as conn:
        posts = conn.execute(
            f"""
            SELECT
                post.*,
                account.full_name,
                COUNT(reply.id) AS reply_count
            FROM forum_post AS post
            LEFT JOIN site_account AS account ON account.account = post.author_account
            LEFT JOIN forum_reply AS reply
                ON reply.post_id = post.id
                AND reply.status = ?
                AND COALESCE(reply.deleted_at, '') = ''
            {where_sql}
            GROUP BY post.id
            ORDER BY
                CASE WHEN post.status = 'pending' THEN 0 ELSE 1 END,
                post.is_pinned DESC,
                post.created_at DESC
            LIMIT 200
            """,
            params,
        ).fetchall()
        replies = conn.execute(
            """
            SELECT
                reply.*,
                account.full_name,
                post.title AS post_title
            FROM forum_reply AS reply
            LEFT JOIN site_account AS account ON account.account = reply.author_account
            LEFT JOIN forum_post AS post ON post.id = reply.post_id
            ORDER BY
                CASE WHEN reply.status = 'pending' THEN 0 ELSE 1 END,
                reply.created_at DESC
            LIMIT 200
            """
        ).fetchall()
    reply_payload = []
    for row in replies:
        item = forum_reply_response(row)
        item["post_title"] = row["post_title"] or ""
        reply_payload.append(item)
    return {
        "posts": [forum_post_response(row) for row in posts],
        "replies": reply_payload,
    }


@app.put("/api/admin/forum/posts/{post_id}")
def moderate_forum_post(
    post_id: str,
    payload: ForumModerationRequest,
    reviewer: str = Depends(require_admin),
) -> dict[str, Any]:
    status = normalize_forum_status(payload.status)
    reject_reason = normalize_forum_content(payload.reject_reason, "处理说明", 500) if payload.reject_reason.strip() else ""
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT id FROM forum_post WHERE id = ?", (post_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="帖子不存在")
        conn.execute(
            """
            UPDATE forum_post
            SET status = ?,
                reject_reason = ?,
                reviewed_by = ?,
                reviewed_at = ?,
                is_pinned = COALESCE(?, is_pinned),
                is_locked = COALESCE(?, is_locked),
                updated_at = ?
            WHERE id = ?
            """,
            (
                status,
                reject_reason,
                reviewer,
                timestamp,
                None if payload.is_pinned is None else 1 if payload.is_pinned else 0,
                None if payload.is_locked is None else 1 if payload.is_locked else 0,
                timestamp,
                post_id,
            ),
        )
        row = conn.execute(
            """
            SELECT post.*, account.full_name, COUNT(reply.id) AS reply_count
            FROM forum_post AS post
            LEFT JOIN site_account AS account ON account.account = post.author_account
            LEFT JOIN forum_reply AS reply
                ON reply.post_id = post.id
                AND reply.status = ?
                AND COALESCE(reply.deleted_at, '') = ''
            WHERE post.id = ?
            GROUP BY post.id
            """,
            (FORUM_PUBLIC_STATUS, post_id),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return forum_post_response(row)


@app.delete("/api/admin/forum/posts/{post_id}")
def delete_forum_post(post_id: str, _: str = Depends(require_admin)) -> dict[str, str]:
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT id FROM forum_post WHERE id = ?", (post_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="帖子不存在")
        conn.execute(
            """
            UPDATE forum_post
            SET deleted_at = ?, status = 'hidden', updated_at = ?
            WHERE id = ?
            """,
            (timestamp, timestamp, post_id),
        )
    return {"id": post_id}


@app.put("/api/admin/forum/replies/{reply_id}")
def moderate_forum_reply(
    reply_id: str,
    payload: ForumModerationRequest,
    reviewer: str = Depends(require_admin),
) -> dict[str, str]:
    status = normalize_forum_status(payload.status)
    reject_reason = normalize_forum_content(payload.reject_reason, "处理说明", 500) if payload.reject_reason.strip() else ""
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT id, post_id FROM forum_reply WHERE id = ?", (reply_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="回复不存在")
        conn.execute(
            """
            UPDATE forum_reply
            SET status = ?,
                reject_reason = ?,
                reviewed_by = ?,
                reviewed_at = ?
            WHERE id = ?
            """,
            (status, reject_reason, reviewer, timestamp, reply_id),
        )
        conn.execute("UPDATE forum_post SET updated_at = ? WHERE id = ?", (timestamp, existing["post_id"]))
    return {"id": reply_id}


@app.delete("/api/admin/forum/replies/{reply_id}")
def delete_forum_reply(reply_id: str, _: str = Depends(require_admin)) -> dict[str, str]:
    timestamp = now_iso()
    with db_connection() as conn:
        existing = conn.execute("SELECT id, post_id FROM forum_reply WHERE id = ?", (reply_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="回复不存在")
        conn.execute(
            """
            UPDATE forum_reply
            SET deleted_at = ?, status = 'hidden'
            WHERE id = ?
            """,
            (timestamp, reply_id),
        )
        conn.execute("UPDATE forum_post SET updated_at = ? WHERE id = ?", (timestamp, existing["post_id"]))
    return {"id": reply_id}


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
            LEFT JOIN forum_reply AS reply
                ON reply.post_id = post.id
                AND reply.status = ?
                AND COALESCE(reply.deleted_at, '') = ''
            WHERE post.status = ?
                AND COALESCE(post.deleted_at, '') = ''
            GROUP BY post.id
            ORDER BY post.is_pinned DESC, post.created_at DESC
            LIMIT 100
            """,
            (FORUM_PUBLIC_STATUS, FORUM_PUBLIC_STATUS),
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
            INSERT INTO forum_post (
                id, title, content, author_account, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
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
            LEFT JOIN forum_reply AS reply
                ON reply.post_id = post.id
                AND reply.status = ?
                AND COALESCE(reply.deleted_at, '') = ''
            WHERE post.id = ?
                AND post.status = ?
                AND COALESCE(post.deleted_at, '') = ''
            GROUP BY post.id
            """,
            (FORUM_PUBLIC_STATUS, post_id, FORUM_PUBLIC_STATUS),
        ).fetchone()
        if post is None:
            raise HTTPException(status_code=404, detail="帖子不存在")
        replies = conn.execute(
            """
            SELECT reply.*, account.full_name
            FROM forum_reply AS reply
            LEFT JOIN site_account AS account ON account.account = reply.author_account
            WHERE reply.post_id = ?
                AND reply.status = ?
                AND COALESCE(reply.deleted_at, '') = ''
            ORDER BY reply.created_at ASC
            """,
            (post_id, FORUM_PUBLIC_STATUS),
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
        post = conn.execute(
            """
            SELECT id, is_locked
            FROM forum_post
            WHERE id = ?
                AND status = ?
                AND COALESCE(deleted_at, '') = ''
            """,
            (post_id, FORUM_PUBLIC_STATUS),
        ).fetchone()
        if post is None:
            raise HTTPException(status_code=404, detail="帖子不存在")
        if post["is_locked"]:
            raise HTTPException(status_code=400, detail="帖子已锁定，暂时不能回复")
        conn.execute(
            """
            INSERT INTO forum_reply (id, post_id, content, author_account, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            """,
            (reply_id, post_id, content, author_account, timestamp),
        )
        conn.execute("UPDATE forum_post SET updated_at = ? WHERE id = ?", (timestamp, post_id))
    return {"id": reply_id, "post_id": post_id}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict[str, str]:
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
) -> dict[str, Any]:
    require_site_plan_editor(payload)
    return {
        "season_year": payload.season_year,
        "month": payload.month,
        "plans": save_season_plan(payload.season_year, payload.month, payload.plans),
    }


@app.post("/api/invoices/upload")
async def upload_invoice_form(
    team_name: str = Form(...),
    submitter_name: str = Form(...),
    remark: str = Form(""),
    form_file: UploadFile = File(...),
) -> dict[str, str]:
    if not team_name.strip() or not submitter_name.strip():
        raise HTTPException(status_code=400, detail="兵种名称、提交人姓名不能为空")
    if not form_file.filename or Path(form_file.filename).suffix.lower() != ".xlsx":
        raise HTTPException(status_code=400, detail="只支持上传 .xlsx 表格")
    content = await form_file.read()
    if len(content) > MAX_CONTENT_LENGTH:
        raise HTTPException(status_code=413, detail="文件超过 50MB 上限")

    submitter_id = "invoice"
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
    filename = "发票表格模板.xlsx"
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
