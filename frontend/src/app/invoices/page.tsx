"use client";

import { FormEvent, useState } from "react";
import { API_BASE, downloadUrl } from "@/lib/api";

export default function InvoicesPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(`${API_BASE}/api/invoices/upload`, {
        method: "POST",
        body: data,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail ?? "上传失败");
      }
      setMessage(`上传成功，批次编号：${body.batch_id}`);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <section className="panel">
        <span className="eyebrow">INVOICE SYSTEM</span>
        <h1>发票管理</h1>
        <p>成员在这里上传固定格式 `.xlsx` 采购表格，发票信息直接来自表格字段。</p>
        <div className="hero-actions">
          <a className="ghost-button" href={downloadUrl("/api/invoices/template")}>
            下载表格模板
          </a>
          <a className="ghost-button" href="/admin">
            管理员后台
          </a>
        </div>
      </section>

      <section className="section panel">
        <h2>提交采购表格</h2>
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
          {error ? <div className="message error">{error}</div> : null}
        </form>
      </section>
    </div>
  );
}
