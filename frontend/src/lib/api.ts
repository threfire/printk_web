function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

const PUBLIC_API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
const INTERNAL_API_BASE = (
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000"
).trim();

const SERVER_API_BASE = trimTrailingSlash(INTERNAL_API_BASE);

function browserApiBase() {
  const configured = PUBLIC_API_BASE;
  if (!configured || configured === "/") {
    return window.location.origin;
  }
  if (configured.startsWith("/")) {
    return `${window.location.origin}${configured === "/" ? "" : configured}`;
  }
  const isLoopback = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(configured);
  if (configured && !isLoopback) {
    return trimTrailingSlash(configured);
  }
  const port = configured.match(/:(\d+)(?:\/|$)/)?.[1] || "8000";
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

export const API_BASE =
  typeof window === "undefined" ? SERVER_API_BASE : browserApiBase();

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

export type ApiRecord = Record<string, string | number | null>;

export type BatchDetailData = {
  batch: ApiRecord;
  rows: ApiRecord[];
};

export type SeasonPlanItem = {
  id?: string;
  season_year?: number;
  month?: number;
  group_name: string;
  status: string;
  target: string;
  display_order?: number;
  updated_at?: string;
};

export type SeasonPlanData = {
  season_year: number;
  month: number;
  plans: SeasonPlanItem[];
};

export function token() {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return window.localStorage.getItem("printk-token") ?? "";
  } catch {
    return "";
  }
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
