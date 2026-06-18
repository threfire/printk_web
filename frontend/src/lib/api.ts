export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type DashboardData = {
  counts: {
    unregistered: number;
    pending_review: number;
    in_stock: number;
    out_stock: number;
  };
  pending_batches: Array<Record<string, string | number | null>>;
  in_stock_rows: Array<Record<string, string | number | null>>;
  reimbursement_batches: Array<Record<string, string | number | null>>;
  logs: Array<Record<string, string | number | null>>;
};

export function token() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem("printk-token") ?? "";
}

export function authHeaders() {
  const currentToken = token();
  return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
}

export async function apiJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "请求失败" }));
    throw new Error(body.detail ?? "请求失败");
  }
  return response.json() as Promise<T>;
}

export function downloadUrl(path: string) {
  return `${API_BASE}${path}`;
}
