import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { requireImage2User } from "@/lib/image2-auth";
import { Image2Channel, readImage2Channels } from "@/lib/image2-channel";

const LOG_PATH = path.resolve(process.cwd(), "..", "storage", "logs", "image2-api.log");
const IMAGE_MODEL = "gpt-image-2";
const MAX_REFERENCE_IMAGES = 16;
const SUPPORTED_MODES = new Set(["text", "image"]);
const UPSTREAM_TIMEOUT_MS = 270_000;
const RETRYABLE_UPSTREAM_STATUS = new Set([502, 503, 504, 524]);
const MAX_UPSTREAM_ATTEMPTS = 2;

export const runtime = "nodejs";
export const maxDuration = 300;

type Image2Item = {
  url?: string;
  b64_json?: string;
};

type Image2Response = {
  data?: Image2Item[];
  error?: { message?: string };
};

type Image2StreamEvent = Image2Response & {
  type?: string;
  b64_json?: string;
  partial_image_b64?: string;
  result?: string;
  response?: {
    output?: Array<{
      type?: string;
      result?: string;
    }>;
  };
  detail?: string;
};

type ImageResult = {
  url: string;
  b64: string;
};

type Image2Log = {
  requestId: string;
  event: string;
  channelId?: string;
  provider?: string;
  mode?: string;
  size?: string;
  n?: number;
  endpoint?: string;
  referenceImageCount?: number;
  status?: number;
  contentType?: string;
  durationMs?: number;
  message?: string;
  error?: string;
  body?: string;
};

type Image2RequestContext = {
  channelId: string;
  provider: string;
  mode: string;
  size: string;
  n: number;
  endpoint: string;
  referenceImageCount: number;
};

function textValue(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(textValue(value, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function endpoint(baseUrl: string, routePath: string) {
  const base = baseUrl.replace(/\/$/, "");
  const apiBase = base.endsWith("/v1") ? base : `${base}/v1`;
  return `${apiBase}${routePath}`;
}

function providerName(config: Image2Channel) {
  return (config.provider ?? config._type ?? "").toLowerCase();
}

function isAheConfig(config: Image2Channel) {
  const provider = providerName(config);
  return provider.includes("ahe") || provider.includes("heyroute") || (config.url ?? "").includes("heyroute.ai");
}

function imageModel(config: Image2Channel) {
  return isAheConfig(config) ? IMAGE_MODEL : config.model || IMAGE_MODEL;
}

function responseFormat(config: Image2Channel) {
  if (isAheConfig(config)) {
    return "b64_json";
  }
  if (config.include_response_format === false) {
    return "";
  }
  return config.response_format ?? "";
}

function imageRoutePath(config: Image2Channel, mode: string) {
  if (mode === "image") {
    return config.edit_path || "/images/edits";
  }
  return config.generation_path || "/images/generations";
}

async function writeImage2Log(entry: Image2Log) {
  const line = JSON.stringify({ time: new Date().toISOString(), ...entry });
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, `${line}\n`, "utf8");
  } catch {}
}

function clippedText(value: string, maxLength = 2000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function normalizedSize(value: string, mode: string) {
  const generationSizes: Record<string, string> = {
    "1:1": "1024x1024",
    "16:9": "1536x864",
    "9:16": "864x1536",
    "4:3": "1536x1152",
    "3:4": "1152x1536",
    "2K": "2048x2048",
    "4K": "3840x2160",
  };

  const editSizes: Record<string, string> = {
    "1:1": "1024x1024",
    "16:9": "1536x1024",
    "9:16": "1024x1536",
    "4:3": "1536x1024",
    "3:4": "1024x1536",
    "2K": "1024x1024",
    "4K": "1024x1024",
  };

  if (mode === "image") {
    if (editSizes[value]) {
      return editSizes[value];
    }
    return value === "1024x1024" || value === "1536x1024" || value === "1024x1536" || value === "auto"
      ? value
      : "1024x1024";
  }

  if (generationSizes[value]) {
    return generationSizes[value];
  }
  return /^(\d{3,4})x(\d{3,4})$/.test(value) || value === "auto" ? value : "1024x1024";
}

function imageFromBase64(b64: string): ImageResult {
  return { url: "", b64 };
}

function imagesFromResponse(body: Image2Response): ImageResult[] {
  return (
    body.data?.map((item) => ({
      url: item.url ?? "",
      b64: item.b64_json ?? "",
    })) ?? []
  );
}

function imagesFromEvent(event: Image2StreamEvent): ImageResult[] {
  const images = imagesFromResponse(event);
  if (event.b64_json) {
    images.push(imageFromBase64(event.b64_json));
  }
  if (event.partial_image_b64) {
    images.push(imageFromBase64(event.partial_image_b64));
  }
  if (event.result) {
    images.push(imageFromBase64(event.result));
  }
  const responseImages =
    event.response?.output
      ?.filter((output) => output.type === "image_generation_call" && output.result)
      .map((output) => imageFromBase64(output.result ?? "")) ?? [];
  return [...images, ...responseImages].filter((image) => image.url || image.b64);
}

function upstreamErrorMessage(body: Image2StreamEvent, fallback: string) {
  return body.error?.message ?? body.detail ?? fallback;
}

async function upstreamError(response: Response, fallback: string, requestId: string) {
  const text = await response.text().catch(() => "");
  let body: Image2StreamEvent = {};
  try {
    body = text ? (JSON.parse(text) as Image2StreamEvent) : {};
  } catch {}
  await writeImage2Log({
    requestId,
    event: "upstream_error",
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: clippedText(text),
  });
  return upstreamErrorMessage(body, `${fallback}：上游 HTTP ${response.status}`);
}

async function logUpstreamError(response: Response, requestId: string) {
  const text = await response.text().catch(() => "");
  await writeImage2Log({
    requestId,
    event: "upstream_error",
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: clippedText(text),
  });
}

function jsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

function parseSseBlock(block: string) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();
  return data || block.trim();
}

function isPartialEvent(type: string) {
  return type.includes("partial_image");
}

function isCompletedEvent(type: string) {
  return type.includes("completed") || type === "response.completed";
}

function parseJsonPayload(payload: string, requestId: string) {
  try {
    return JSON.parse(payload) as Image2StreamEvent;
  } catch (err) {
    void writeImage2Log({
      requestId,
      event: "stream_parse_error",
      error: err instanceof Error ? err.message : "JSON 解析失败",
      body: clippedText(payload),
    });
    return null;
  }
}

async function pipeStreamingBody(
  response: Response,
  send: (value: unknown) => void,
  finalImages: ImageResult[],
  requestId: string,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const payload = parseSseBlock(part);
      if (!payload || payload === "[DONE]") {
        continue;
      }
      const event = parseJsonPayload(payload, requestId);
      if (!event) {
        continue;
      }
      const images = imagesFromEvent(event);
      const type = event.type ?? "";
      if (isPartialEvent(type) && images[0]) {
        send({ type: "partial", image: images[0] });
      }
      if (isCompletedEvent(type) && images.length) {
        finalImages.splice(0, finalImages.length, ...images);
      }
    }
  }

  const payload = parseSseBlock(buffer);
  if (payload && payload !== "[DONE]") {
    const event = parseJsonPayload(payload, requestId);
    if (!event) {
      return;
    }
    const images = imagesFromEvent(event);
    if (images.length) {
      finalImages.splice(0, finalImages.length, ...images);
    }
  }
}

function streamImageResponse(
  openUpstream: (signal: AbortSignal) => Promise<Response>,
  requestId: string,
  context: Image2RequestContext,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => controller.enqueue(encoder.encode(jsonLine(value)));
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), UPSTREAM_TIMEOUT_MS);
      const startedAt = Date.now();

      try {
        send({ type: "status", requestId, message: "已开始调用 image2，正在等待生成结果。" });
        await writeImage2Log({ requestId, event: "request_start", ...context });

        let upstream: Response | null = null;
        for (let attempt = 1; attempt <= MAX_UPSTREAM_ATTEMPTS; attempt += 1) {
          upstream = await openUpstream(abortController.signal);
          await writeImage2Log({
            requestId,
            event: "upstream_headers",
            ...context,
            status: upstream.status,
            contentType: upstream.headers.get("content-type") ?? "",
            durationMs: Date.now() - startedAt,
            message: `attempt=${attempt}`,
          });

          if (upstream.ok) {
            break;
          }

          if (attempt < MAX_UPSTREAM_ATTEMPTS && RETRYABLE_UPSTREAM_STATUS.has(upstream.status)) {
            await logUpstreamError(upstream, requestId);
            send({ type: "status", requestId, message: `上游 HTTP ${upstream.status}，正在自动重试第 ${attempt + 1} 次。` });
            continue;
          }

          send({ type: "error", requestId, error: await upstreamError(upstream, "image2 调用失败", requestId) });
          return;
        }

        if (!upstream) {
          send({ type: "error", requestId, error: "image2 调用失败" });
          return;
        }

        const contentType = upstream.headers.get("content-type") ?? "";
        if (contentType.includes("text/event-stream")) {
          const finalImages: ImageResult[] = [];
          await pipeStreamingBody(upstream, send, finalImages, requestId);
          await writeImage2Log({
            requestId,
            event: "stream_done",
            ...context,
            durationMs: Date.now() - startedAt,
            message: `images=${finalImages.length}`,
          });
          send({
            type: "done",
            requestId,
            images: finalImages,
            message: finalImages.length ? `生成完成，共 ${finalImages.length} 张图片。` : "接口已返回，但未发现图片字段。",
          });
          return;
        }

        const text = await upstream.text();
        await writeImage2Log({
          requestId,
          event: "upstream_body",
          ...context,
          durationMs: Date.now() - startedAt,
          body: clippedText(text),
        });
        const body = JSON.parse(text) as Image2Response;
        const images = imagesFromResponse(body);
        send({
          type: "done",
          requestId,
          images,
          raw: body,
          message: images.length ? `生成完成，共 ${images.length} 张图片。` : "接口已返回，但未发现图片字段。",
        });
      } catch (err) {
        const error = err instanceof Error && err.name === "AbortError" ? "image2 调用超过 270 秒" : "image2 调用失败";
        await writeImage2Log({
          requestId,
          event: "request_error",
          ...context,
          durationMs: Date.now() - startedAt,
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        });
        send({ type: "error", requestId, error });
      } finally {
        clearTimeout(timeout);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}

function referenceImages(source: FormData) {
  return source.getAll("image").filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function invalidReferenceImageCount(files: File[]) {
  return files.filter((file) => !file.type.startsWith("image/")).length;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const authError = await requireImage2User(request);
  if (authError) {
    return authError;
  }

  const formData = await request.formData();

  let selectedChannel: Image2Channel;
  try {
    const config = await readImage2Channels();
    const channelId = textValue(formData.get("channelId"), config.defaultChannelId);
    selectedChannel = config.channels.find((channel) => channel.id === channelId) ?? config.channels[0];
    if (!selectedChannel || (selectedChannel.id !== channelId && channelId !== config.defaultChannelId)) {
      return NextResponse.json({ error: "图片通道无效" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "image2 配置读取失败" },
      { status: 500 },
    );
  }

  const mode = textValue(formData.get("mode"), "text");
  if (!SUPPORTED_MODES.has(mode)) {
    return NextResponse.json({ error: "生成模式无效" }, { status: 400 });
  }

  const prompt = textValue(formData.get("prompt"));
  if (!prompt) {
    return NextResponse.json({ error: "请输入提示词" }, { status: 400 });
  }

  const files = referenceImages(formData);
  if (mode === "image") {
    if (!files.length) {
      return NextResponse.json({ error: "请上传至少 1 张参考图" }, { status: 400 });
    }
    if (files.length > MAX_REFERENCE_IMAGES) {
      return NextResponse.json({ error: `参考图最多支持 ${MAX_REFERENCE_IMAGES} 张` }, { status: 400 });
    }
    if (invalidReferenceImageCount(files) > 0) {
      return NextResponse.json({ error: "参考图文件类型必须是图片" }, { status: 400 });
    }
  }

  const size = normalizedSize(textValue(formData.get("size"), "1024x1024"), mode);
  const n = Math.min(Math.max(numberValue(formData.get("n"), 1), 1), 4);
  const headers = { Authorization: `Bearer ${selectedChannel.key}` };
  const baseUrl = selectedChannel.url;
  const routePath = imageRoutePath(selectedChannel, mode);
  const upstreamEndpoint = endpoint(baseUrl, routePath);
  const model = imageModel(selectedChannel);
  const format = responseFormat(selectedChannel);

  return streamImageResponse(
    (signal) =>
      mode === "image"
        ? requestImageEdit(baseUrl, routePath, files, prompt, size, n, model, format, headers, signal)
        : requestImageGeneration(baseUrl, routePath, prompt, size, n, model, format, headers, signal),
    requestId,
    {
      channelId: selectedChannel.id,
      provider: selectedChannel.provider,
      mode,
      size,
      n,
      endpoint: upstreamEndpoint,
      referenceImageCount: files.length,
    },
  );
}

async function requestImageGeneration(
  baseUrl: string,
  routePath: string,
  prompt: string,
  size: string,
  n: number,
  model: string,
  format: string,
  headers: Record<string, string>,
  signal: AbortSignal,
) {
  const body: Record<string, string | number> = {
    model,
    prompt,
    n,
    size,
  };
  if (format) {
    body.response_format = format;
  }

  return fetch(endpoint(baseUrl, routePath), {
    method: "POST",
    signal,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function requestImageEdit(
  baseUrl: string,
  routePath: string,
  files: File[],
  prompt: string,
  size: string,
  n: number,
  model: string,
  format: string,
  headers: Record<string, string>,
  signal: AbortSignal,
) {
  if (!files.length) {
    return Response.json({ error: { message: "请上传至少 1 张参考图" } }, { status: 400 });
  }

  const payload = new FormData();
  payload.set("model", model);
  payload.set("prompt", prompt);
  payload.set("n", String(n));
  payload.set("size", size);
  if (format) {
    payload.set("response_format", format);
  }
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    payload.append("image", file, file.name || `reference-${index + 1}.png`);
  }

  return fetch(endpoint(baseUrl, routePath), {
    method: "POST",
    signal,
    headers,
    body: payload,
  });
}
