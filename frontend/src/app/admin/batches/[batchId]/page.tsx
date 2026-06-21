import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, BatchDetailData } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type BatchPageProps = {
  params: Promise<{
    batchId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function fetchBatchDetail(
  batchId: string,
  token: string,
): Promise<BatchDetailData | null> {
  const response = await fetch(`${API_BASE}/api/invoices/batches/${batchId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<BatchDetailData>;
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function statusLabel(status: unknown) {
  const value = String(status ?? "");
  const labels: Record<string, string> = {
    pending_review: "待复核",
    confirmed: "已确认",
    rejected: "已驳回",
  };
  return labels[value] ?? text(value);
}

export default async function BatchDetailPage({ params, searchParams }: BatchPageProps) {
  const { batchId } = await params;
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  const query = (await searchParams) ?? {};
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);

  if (!token) {
    redirect("/admin");
  }

  const detail = await fetchBatchDetail(batchId, token);

  if (!detail) {
    redirect("/api/admin/logout");
  }

  const pendingRows = detail.rows.filter((row) => row.review_status === "pending_review");
  const confirmedRows = detail.rows.filter((row) => row.review_status === "confirmed");
  const rejectedRows = detail.rows.filter((row) => row.review_status === "rejected");
  const encodedBatchId = encodeURIComponent(batchId);

  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">BATCH REVIEW</span>
        <h1>批次复核</h1>
        <p>
          批次 {text(detail.batch.id)}，提交人 {text(detail.batch.submitter_name)}，当前状态{" "}
          {statusLabel(detail.batch.status)}
        </p>
        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
        <div className="hero-actions">
          <Link className="ghost-button" href="/admin">
            返回后台
          </Link>
          <a className="ghost-button" href={`/api/admin/forms/${encodedBatchId}`}>
            下载原始表格
          </a>
          <form action={`/api/admin/batches/${encodedBatchId}/confirm-all`} method="post">
            <button className="button" type="submit" disabled={pendingRows.length === 0}>
              整批确认
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">SUMMARY</span>
          <h2>复核进度</h2>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{pendingRows.length}</strong>待复核
          </div>
          <div className="stat">
            <strong>{confirmedRows.length}</strong>已确认
          </div>
          <div className="stat">
            <strong>{rejectedRows.length}</strong>已驳回
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">DETAILS</span>
          <h2>采购明细</h2>
        </div>
        <div className="table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>行号</th>
                <th>物资</th>
                <th>规格</th>
                <th>数量</th>
                <th>单价</th>
                <th>金额</th>
                <th>供应商</th>
                <th>发票号码</th>
                <th>发票金额</th>
                <th>状态</th>
                <th>驳回原因</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((row) => {
                const rowId = String(row.id);
                const isPending = row.review_status === "pending_review";

                return (
                  <tr key={rowId}>
                    <td>{text(row.row_no)}</td>
                    <td>{text(row.item_name)}</td>
                    <td>{text(row.spec_model)}</td>
                    <td>{text(row.quantity)}</td>
                    <td>{text(row.unit_price)}</td>
                    <td>{text(row.amount)}</td>
                    <td>{text(row.supplier_name)}</td>
                    <td>{text(row.invoice_number)}</td>
                    <td>{text(row.invoice_amount)}</td>
                    <td>
                      <span className="badge">{statusLabel(row.review_status)}</span>
                    </td>
                    <td>{text(row.review_note)}</td>
                    <td>
                      {isPending ? (
                        <div className="row-actions">
                          <form
                            className="row-action-form"
                            action={`/api/admin/batches/${encodedBatchId}/confirm-selected`}
                            method="post"
                          >
                            <input type="hidden" name="row_ids" value={rowId} />
                            <button className="ghost-button" type="submit">
                              确认
                            </button>
                          </form>
                          <form
                            className="row-action-form reject-form"
                            action={`/api/admin/batches/${encodedBatchId}/reject-selected`}
                            method="post"
                          >
                            <input type="hidden" name="row_ids" value={rowId} />
                            <input
                              className="review-note-input"
                              name="note"
                              placeholder="填写驳回原因"
                              required
                            />
                            <button className="ghost-button danger-button" type="submit">
                              驳回
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="muted">已处理</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {detail.rows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={12}>
                    当前批次没有明细
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
