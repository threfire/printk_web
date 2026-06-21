"use client";

import { FormEvent, useState } from "react";
import { API_BASE, downloadUrl } from "@/lib/api";

const RECENT_BATCH_KEY = "printk-recent-invoice-batch";

type UploadResult = {
  batch_id?: string;
  message?: string;
};

type RecentBatch = {
  batchId: string;
  submittedAt: string;
};

function formatSubmittedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvoicesPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastBatchId, setLastBatchId] = useState("");
  const [recentBatch, setRecentBatch] = useState<RecentBatch | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(RECENT_BATCH_KEY);
      return raw ? (JSON.parse(raw) as RecentBatch) : null;
    } catch {
      return null;
    }
  });
  const [submitting, setSubmitting] = useState(false);

  function rememberBatch(batchId: string) {
    const nextRecentBatch = {
      batchId,
      submittedAt: new Date().toISOString(),
    };
    setRecentBatch(nextRecentBatch);
    try {
      window.localStorage.setItem(RECENT_BATCH_KEY, JSON.stringify(nextRecentBatch));
    } catch {
      setRecentBatch(nextRecentBatch);
    }
  }

  function clearRecentBatch() {
    setRecentBatch(null);
    try {
      window.localStorage.removeItem(RECENT_BATCH_KEY);
    } catch {
      setRecentBatch(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLastBatchId("");
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(`${API_BASE}/api/invoices/upload`, {
        method: "POST",
        body: data,
      });
      const body = (await response.json().catch(() => ({}))) as UploadResult & { detail?: string };
      if (!response.ok) {
        throw new Error(body.detail ?? "上传失败");
      }
      const batchId = body.batch_id ?? "";
      setLastBatchId(batchId);
      if (batchId) {
        rememberBatch(batchId);
      }
      setMessage(batchId ? `上传成功，批次编号：${batchId}` : "上传成功");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">INVOICE SYSTEM</span>
        <h1>发票管理</h1>
        <p>成员在这里上传固定格式的 .xlsx 采购表格，发票信息直接来自表格字段。</p>
        <div className="hero-actions">
          <a className="ghost-button" href={downloadUrl("/api/invoices/template")}>
            下载表格模板
          </a>
          <a className="ghost-button" href="/admin">
            管理员后台
          </a>
        </div>
      </section>

      {recentBatch ? (
        <section className="section recent-batch">
          <div className="section-heading">
            <span className="eyebrow">RECENT</span>
            <h2>最近提交批次</h2>
          </div>
          <div className="message">
            <strong>{recentBatch.batchId}</strong>
            <span>提交时间：{formatSubmittedAt(recentBatch.submittedAt)}</span>
            <span>当前已进入未入库队列，管理员执行本地审核扫描后会进入复核流程。</span>
            <button className="text-button" type="button" onClick={clearRecentBatch}>
              清除记录
            </button>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">UPLOAD</span>
          <h2>提交采购表格</h2>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="team_name">团队名称</label>
            <input id="team_name" name="team_name" required placeholder="例如：PRINTK 战队" />
          </div>
          <div className="field">
            <label htmlFor="submitter_name">提交人姓名</label>
            <input id="submitter_name" name="submitter_name" required />
          </div>
          <div className="field">
            <label htmlFor="submitter_id">提交人编号</label>
            <input id="submitter_id" name="submitter_id" required />
          </div>
          <div className="field">
            <label htmlFor="form_file">采购表格</label>
            <input id="form_file" name="form_file" type="file" accept=".xlsx" required />
          </div>
          <div className="field">
            <label htmlFor="remark">备注</label>
            <textarea id="remark" name="remark" rows={4} />
          </div>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "正在上传..." : "提交表格"}
          </button>
          {message ? <div className="message">{message}</div> : null}
          {lastBatchId ? (
            <div className="message">
              批次已进入未入库队列，管理员执行本地审核扫描后会进入复核流程。
            </div>
          ) : null}
          {error ? <div className="message error">{error}</div> : null}
        </form>
      </section>
    </div>
  );
}
