function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function isRelativeApiBase(value: string) {
  return value.startsWith("/");
}

const PUBLIC_API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
const INTERNAL_API_BASE = (process.env.INTERNAL_API_BASE_URL || "").trim();
const DEFAULT_SERVER_API_BASE = "http://127.0.0.1:8000";

function serverApiBase() {
  if (INTERNAL_API_BASE) {
    return trimTrailingSlash(INTERNAL_API_BASE);
  }

  if (PUBLIC_API_BASE && !isRelativeApiBase(PUBLIC_API_BASE)) {
    return trimTrailingSlash(PUBLIC_API_BASE);
  }

  return DEFAULT_SERVER_API_BASE;
}

const SERVER_API_BASE = serverApiBase();

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
  robot_type: string;
  task_title: string;
  status: string;
  target: string;
  assignee_account: string;
  is_completed: boolean;
  display_order?: number;
  updated_at?: string;
};

export type SeasonPlanData = {
  season_year: number;
  month: number;
  plans: SeasonPlanItem[];
};

export type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_account: string;
  author_name: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  reject_reason: string;
  reviewed_by: string;
  reviewed_at: string;
  deleted_at: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
};

export type ForumReply = {
  id: string;
  post_id: string;
  content: string;
  author_account: string;
  author_name: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  reject_reason: string;
  reviewed_by: string;
  reviewed_at: string;
  deleted_at: string;
  created_at: string;
  updated_at: string;
};

export type AdminForumReply = ForumReply & {
  post_title: string;
};

export type ForumInboxReply = AdminForumReply & {
  post_status: ForumPost["status"] | "";
};

export type ForumPostListData = {
  posts: ForumPost[];
};

export type ForumPostDetailData = {
  post: ForumPost;
  replies: ForumReply[];
};

export type ForumManagementData = {
  posts: ForumPost[];
  replies: AdminForumReply[];
};

export type ForumInboxData = {
  posts: ForumPost[];
  replies: ForumInboxReply[];
};

export type HomepageAsset = {
  id: string;
  kind: "video" | "image";
  url: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  alt: string;
  display_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type HomepageQuote = {
  id: string;
  text: string;
  source: string;
  display_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type HomepageContentData = {
  video: HomepageAsset | null;
  videos: HomepageAsset[];
  images: HomepageAsset[];
  quotes: HomepageQuote[];
};

export type RewardRankingItem = {
  rank: number;
  account: string;
  full_name: string;
  member_status: string;
  department: string;
  reward_score: number;
  updated_at: string;
};

export type RewardRankingData = {
  ranking: RewardRankingItem[];
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
