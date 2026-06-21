import { API_BASE } from "@/lib/api";

type SiteMediaRouteContext = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, { params }: SiteMediaRouteContext) {
  const { filename } = await params;
  const response = await fetch(`${API_BASE}/api/site-media/${encodeURIComponent(filename)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return Response.json({ detail: "媒体文件不存在" }, { status: response.status });
  }
  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");
  const contentLength = response.headers.get("Content-Length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
