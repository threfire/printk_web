export function feedbackPath(path: string, key: "ok" | "error", message: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("ok");
  params.delete("error");
  params.set(key, message);
  return `${pathname}?${params.toString()}`;
}

export function adminReturnPath(request: Request, fallback = "/admin") {
  const referer = request.headers.get("referer");
  if (!referer) {
    return fallback;
  }
  try {
    const url = new URL(referer);
    if (!url.pathname.startsWith("/admin")) {
      return fallback;
    }
    url.searchParams.delete("ok");
    url.searchParams.delete("error");
    const query = url.searchParams.toString();
    return `${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return fallback;
  }
}

export async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({ detail: fallback }));
  return String(body.detail ?? fallback);
}

export function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
