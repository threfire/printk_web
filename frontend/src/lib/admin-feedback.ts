export function feedbackPath(path: string, key: "ok" | "error", message: string) {
  const params = new URLSearchParams({ [key]: message });
  return `${path}?${params.toString()}`;
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
