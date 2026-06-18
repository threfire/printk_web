"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiJson, DashboardData } from "@/lib/api";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(window.localStorage.getItem("printk-token"));
  });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.localStorage.getItem("printk-token")) {
      void loadDashboard();
    }
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const result = await apiJson<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password, role: "admin" }),
      });
      window.localStorage.setItem("printk-token", result.token);
      setLoggedIn(true);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  }

  async function loadDashboard() {
    try {
      const data = await apiJson<DashboardData>("/api/invoices/dashboard");
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取后台失败");
    }
  }

  async function runReview() {
    setMessage("");
    setError("");
    try {
      const result = await apiJson<{ processed: number }>("/api/invoices/review/run", {
        method: "POST",
      });
      setMessage(`本次扫描批次数：${result.processed}`);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "扫描失败");
    }
  }

  async function confirmAll(batchId: string) {
    await apiJson(`/api/invoices/batches/${batchId}/confirm-all`, { method: "POST" });
    await apiJson(`/api/invoices/batches/${batchId}/complete`, { method: "POST" });
    setMessage("批次已确认入库");
    await loadDashboard();
  }

  async function reimburse(recordId: string) {
    await apiJson("/api/invoices/reimburse", {
      method: "POST",
      body: JSON.stringify({ record_ids: [recordId] }),
    });
    setMessage("已提取出库");
    await loadDashboard();
  }

  if (!loggedIn) {
    return (
      <div className="page">
        <section className="panel">
          <span className="eyebrow">ADMIN</span>
          <h1>管理后台</h1>
          <form className="form" onSubmit={login}>
            <div className="field">
              <label htmlFor="password">管理员密码</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button className="button" type="submit">
              登录
            </button>
            {error ? <div className="message error">{error}</div> : null}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="panel">
        <span className="eyebrow">ADMIN</span>
        <h1>管理后台</h1>
        <div className="hero-actions">
          <button className="button" type="button" onClick={runReview}>
            执行本地审核扫描
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              window.localStorage.removeItem("printk-token");
              setLoggedIn(false);
            }}
          >
            退出登录
          </button>
        </div>
        {message ? <div className="message">{message}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
      </section>

      {dashboard ? (
        <>
          <section className="section panel">
            <h2>状态总览</h2>
            <div className="stats">
              <div className="stat">
                <strong>{dashboard.counts.unregistered}</strong>未入库
              </div>
              <div className="stat">
                <strong>{dashboard.counts.pending_review}</strong>待复核
              </div>
              <div className="stat">
                <strong>{dashboard.counts.in_stock}</strong>库内明细
              </div>
              <div className="stat">
                <strong>{dashboard.counts.out_stock}</strong>出库明细
              </div>
            </div>
          </section>

          <section className="section panel">
            <h2>待入库批次</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>批次</th>
                    <th>提交人</th>
                    <th>待确认</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pending_batches.map((batch) => (
                    <tr key={String(batch.id)}>
                      <td>{String(batch.id)}</td>
                      <td>{String(batch.submitter_name)}</td>
                      <td>{String(batch.pending_rows ?? 0)}</td>
                      <td>
                        <button className="ghost-button" type="button" onClick={() => confirmAll(String(batch.id))}>
                          整批确认
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section panel">
            <h2>库内明细</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>物资</th>
                    <th>金额</th>
                    <th>发票号码</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.in_stock_rows.map((row) => (
                    <tr key={String(row.id)}>
                      <td>{String(row.item_name)}</td>
                      <td>{String(row.amount)}</td>
                      <td>{String(row.invoice_number)}</td>
                      <td>
                        <button className="ghost-button" type="button" onClick={() => reimburse(String(row.id))}>
                          提取出库
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
