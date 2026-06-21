import { NextRequest, NextResponse } from "next/server";
import { requireImage2User } from "@/lib/image2-auth";
import { listImage2ChannelOptions, readImage2Channels } from "@/lib/image2-channel";

export async function GET(request: NextRequest) {
  const authError = await requireImage2User(request);
  if (authError) {
    return authError;
  }

  try {
    const config = await readImage2Channels();
    return NextResponse.json({
      defaultChannelId: config.defaultChannelId,
      channels: listImage2ChannelOptions(config),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "图片通道读取失败" },
      { status: 500 },
    );
  }
}
