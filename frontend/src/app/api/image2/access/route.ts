import { NextRequest, NextResponse } from "next/server";
import { image2AccessState } from "@/lib/image2-auth";

export async function GET(request: NextRequest) {
  const access = await image2AccessState(request);
  return NextResponse.json(access, { status: access.status });
}
