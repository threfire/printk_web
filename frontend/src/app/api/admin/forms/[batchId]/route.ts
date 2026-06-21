import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  if (!token) {
    return NextResponse.redirect(new URL(feedbackPath("/admin", "error", "请先登录管理员后台"), request.url));
  }

  const { batchId } = await params;
  const response = await fetch(`${API_BASE}/api/invoices/forms/${encodeURIComponent(batchId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    const message = await responseError(response, "原始表格下载失败");
    return NextResponse.redirect(
      new URL(feedbackPath(`/admin/batches/${encodeURIComponent(batchId)}`, "error", message), request.url),
    );
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
