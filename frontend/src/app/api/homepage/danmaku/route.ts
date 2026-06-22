import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
    return body.detail;
  }
  return fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageSrc = searchParams.get("image_src") ?? "";
  const params = imageSrc ? `?image_src=${encodeURIComponent(imageSrc)}` : "";
  const response = await fetch(`${API_BASE}/api/homepage/danmaku${params}`, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json(
      { error: await responseError(response, "弹幕读取失败") },
      { status: response.status },
    );
  }

  return NextResponse.json(await response.json());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_BASE}/api/homepage/danmaku`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageSrc: String(body.imageSrc ?? ""),
      text: String(body.text ?? ""),
      authorAccount: String(body.authorAccount ?? ""),
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: await responseError(response, "弹幕发送失败") },
      { status: response.status },
    );
  }

  return NextResponse.json(await response.json(), { status: response.status });
}
