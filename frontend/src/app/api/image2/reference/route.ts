import { NextRequest, NextResponse } from "next/server";
import { requireImage2User } from "@/lib/image2-auth";

const maxReferenceBytes = 12 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const authError = await requireImage2User(request);
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get("url")?.trim();

  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    return NextResponse.json({ error: "参考图片地址无效" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "参考图片地址无效" }, { status: 400 });
  }

  const response = await fetch(parsedUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      "User-Agent": "HeyRoute-Image2-Reference/1.0",
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "参考图片读取失败" }, { status: 502 });
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "参考图片地址返回的不是图片" }, { status: 415 });
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxReferenceBytes) {
    return NextResponse.json({ error: "参考图片不能超过 12MB" }, { status: 413 });
  }

  const body = await response.arrayBuffer();
  if (body.byteLength > maxReferenceBytes) {
    return NextResponse.json({ error: "参考图片不能超过 12MB" }, { status: 413 });
  }

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
    },
  });
}
