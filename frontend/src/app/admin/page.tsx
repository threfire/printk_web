import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, DashboardData } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function fetchDashboard(token: string): Promise<DashboardData | null> {
  const response = await fetch(`${API_BASE}/api/invoices/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<DashboardData>;
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function formatDateTime(value: unknown) {
  const raw = text(value);
  if (raw === "-") {
    return raw;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  const dashboard = token ? await fetchDashboard(token) : null;
  const params = (await searchParams) ?? {};
  const ok = firstParam(params.ok);
  const error = firstParam(params.error);

  if (token && !dashboard) {
    redirect("/api/admin/logout");
  }

  if (!dashboard) {
    return (
      <div className="page">
        <section className="section-hero">
          <span className="eyebrow">ADMIN</span>
          <h1>管理后台</h1>
          {ok ? <div className="message">{ok}</div> : null}
          {error ? <div className="message error">{error}</div> : null}
          <form className="form" action="/api/admin/login" method="post">
            <div className="field">
              <label htmlFor="password">管理员密码</label>
              <input id="password" name="password" type="password" required />
            </div>
            <button className="button" type="submit">
              登录
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">ADMIN</span>
        <h1>管理后台</h1>
        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
        <div className="hero-actions">
          <form action="/api/admin/review/run" method="post">
            <button className="button" type="submit">
              执行本地审核扫描
            </button>
          </form>
          <form action="/api/admin/logout" method="post">
            <button className="ghost-button" type="submit">
              退出登录
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">STATUS</span>
          <h2>状态总览</h2>
        </div>
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

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">BATCHES</span>
          <h2>待入库批次</h2>
        </div>
        <div className="table-wrap">
          <table className="admin-batch-table">
            <thead>
              <tr>
                <th>批次</th>
                <th>团队</th>
                <th>提交人</th>
                <th>提交时间</th>
                <th>待确认</th>
                <th>已确认</th>
                <th>已驳回</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.pending_batches.map((batch) => (
                <tr key={String(batch.id)}>
                  <td>{text(batch.id)}</td>
                  <td>{text(batch.team_name)}</td>
                  <td>{text(batch.submitter_name)}</td>
                  <td>{formatDateTime(batch.submitted_at)}</td>
                  <td>{text(batch.pending_rows ?? 0)}</td>
                  <td>{text(batch.confirmed_rows ?? 0)}</td>
                  <td>{text(batch.rejected_rows ?? 0)}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="ghost-button" href={`/admin/batches/${encodeURIComponent(String(batch.id))}`}>
                        查看明细
                      </Link>
                      <form action={`/api/admin/batches/${String(batch.id)}/confirm-all`} method="post">
                        <button className="ghost-button" type="submit">
                          整批确认
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {dashboard.pending_batches.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={8}>
                    当前没有待入库批次
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">STOCK</span>
          <h2>库内明细</h2>
        </div>
        <div className="table-wrap">
          <table className="admin-stock-table">
            <thead>
              <tr>
                <th>批次</th>
                <th>采购日期</th>
                <th>物资</th>
                <th>数量</th>
                <th>金额</th>
                <th>发票号码</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.in_stock_rows.map((row) => (
                <tr key={String(row.id)}>
                  <td>{text(row.batch_id)}</td>
                  <td>{text(row.purchase_date)}</td>
                  <td>{text(row.item_name)}</td>
                  <td>{text(row.quantity)}</td>
                  <td>{text(row.amount)}</td>
                  <td>{text(row.invoice_number)}</td>
                  <td>
                    <form action={`/api/admin/reimburse/${String(row.id)}`} method="post">
                      <button className="ghost-button" type="submit">
                        提取出库
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {dashboard.in_stock_rows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={7}>
                    当前没有库内明细
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">REIMBURSEMENT</span>
          <h2>最近报销批次</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>批次</th>
                <th>记录数</th>
                <th>总金额</th>
                <th>提取时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.reimbursement_batches.map((batch) => (
                <tr key={String(batch.id)}>
                  <td>{text(batch.id)}</td>
                  <td>{text(batch.record_count)}</td>
                  <td>{text(batch.total_amount)}</td>
                  <td>{formatDateTime(batch.extracted_at)}</td>
                  <td>
                    <a className="ghost-button" href={`/api/admin/reimbursements/${String(batch.id)}`}>
                      下载报销表
                    </a>
                  </td>
                </tr>
              ))}
              {dashboard.reimbursement_batches.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    当前没有报销批次
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">LOGS</span>
          <h2>处理日志</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>阶段</th>
                <th>级别</th>
                <th>批次</th>
                <th>消息</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.logs.map((log) => (
                <tr key={String(log.id)}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{text(log.stage)}</td>
                  <td>
                    <span className="badge">{text(log.level)}</span>
                  </td>
                  <td>{text(log.batch_id)}</td>
                  <td>{text(log.message)}</td>
                </tr>
              ))}
              {dashboard.logs.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    当前没有处理日志
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
