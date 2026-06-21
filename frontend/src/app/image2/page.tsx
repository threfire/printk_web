"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";

type ImageResult = {
  url: string;
  b64: string;
};

type Image2Response = {
  images?: ImageResult[];
  message?: string;
  error?: string;
};

type Image2StreamEvent = Image2Response & {
  type?: "status" | "partial" | "done" | "error";
  image?: ImageResult;
};

type Image2AccessState = {
  allowed: boolean;
  message: string;
};

type Image2ChannelOption = {
  id: string;
  name: string;
  provider: string;
  model: string;
};

type Image2OptionsResponse = {
  defaultChannelId?: string;
  channels?: Image2ChannelOption[];
  error?: string;
};

type ReferenceImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type ModeValue = "text" | "image";

const MAX_REFERENCE_IMAGES = 16;
const referenceProxyRoute = "/api/image2/reference";
const modeOptions = [
  { value: "text", label: "文生图" },
  { value: "image", label: "图生图" },
] satisfies { value: ModeValue; label: string }[];

const sizeOptions = ["1:1", "16:9", "9:16", "4:3", "3:4", "2K", "4K"];

function imageSrc(image: ImageResult) {
  if (image.b64) {
    return `data:image/png;base64,${image.b64}`;
  }
  return image.url;
}

function downloadHref(image: ImageResult) {
  return image.b64 ? `data:image/png;base64,${image.b64}` : image.url;
}

function parseStreamLine(value: string) {
  try {
    return JSON.parse(value) as Image2StreamEvent;
  } catch {
    return null;
  }
}

function referenceImageId(index: number) {
  const nativeRandomUUID = globalThis.crypto?.randomUUID;
  if (typeof nativeRandomUUID === "function") {
    return `${nativeRandomUUID.call(globalThis.crypto)}-${index}`;
  }
  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}`;
}

function revokeReferenceImages(images: ReferenceImage[]) {
  for (const image of images) {
    URL.revokeObjectURL(image.previewUrl);
  }
}

function imageFilesFromFileList(files: FileList | null) {
  return Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
}

function imageFilesFromDataTransfer(items: DataTransferItemList | null) {
  return Array.from(items ?? [])
    .filter((entry) => entry.kind === "file" && entry.type.startsWith("image/"))
    .map((entry) => entry.getAsFile())
    .filter((file): file is File => file instanceof File);
}

function extensionFromType(type: string) {
  return type.split("/")[1]?.split("+")[0] || "png";
}

function fileFromBlob(blob: Blob, name: string) {
  if (!blob.type.startsWith("image/")) {
    return null;
  }
  const extension = extensionFromType(blob.type);
  return new File([blob], name.includes(".") ? name : `${name}.${extension}`, { type: blob.type });
}

function fileFromDataUrl(value: string) {
  if (!value.startsWith("data:image/")) {
    return null;
  }
  const [header, data = ""] = value.split(",", 2);
  const type = header.match(/^data:([^;,]+)/)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new File([bytes], `pasted-image.${extensionFromType(type)}`, { type });
}

function firstImageSourceFromHtml(value: string) {
  const document = new DOMParser().parseFromString(value, "text/html");
  const image = document.querySelector("img[src], source[srcset]") as HTMLImageElement | HTMLSourceElement | null;
  const src = image?.getAttribute("src") ?? image?.getAttribute("srcset")?.split(",")[0]?.trim().split(/\s+/)[0];
  return src ?? "";
}

async function fileFromUrl(value: string | null) {
  const url = value?.trim();
  if (!url) {
    return null;
  }
  const dataFile = fileFromDataUrl(url);
  if (dataFile) {
    return dataFile;
  }
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }
  const response = await fetch(`${referenceProxyRoute}?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    return null;
  }
  const blob = await response.blob();
  return fileFromBlob(blob, "url-image");
}

async function filesFromClipboardText(text: string) {
  const trimmed = text.trim();
  const src = trimmed.startsWith("<") ? firstImageSourceFromHtml(trimmed) : trimmed;
  const file = await fileFromUrl(src || trimmed);
  return file ? [file] : [];
}

function referenceSummary(count: number) {
  return `已载入 ${count} 张参考图，提交时会一并发送给图生图接口。`;
}

export default function Image2Page() {
  const [mode, setMode] = useState<ModeValue>("text");
  const [channels, setChannels] = useState<Image2ChannelOption[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [images, setImages] = useState<ImageResult[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceStatus, setReferenceStatus] = useState("");
  const [access, setAccess] = useState<Image2AccessState>({ allowed: false, message: "正在检查账号权限" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceImagesRef = useRef<ReferenceImage[]>([]);

  const currentChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );
  const toolDisabled = !access.allowed || submitting || !selectedChannelId || (mode === "image" && referenceImages.length === 0);

  const examplePrompt = useMemo(
    () =>
      mode === "text"
        ? "一张白底产品说明卡片，主题是 image2 多通道图片生成接入，整体干净、科技感、适合管理后台。"
        : "融合全部参考图的主体元素，保留品牌蓝白科技风，生成一张更完整的产品展示海报。",
    [mode],
  );

  const appendReferenceFiles = useCallback(
    (incoming: File[]) => {
      const validFiles = incoming.filter((file) => file.type.startsWith("image/"));
      if (!validFiles.length) {
        setError("参考图文件类型必须是图片");
        setReferenceStatus("没有读到可用图片。");
        return false;
      }

      const remaining = Math.max(0, MAX_REFERENCE_IMAGES - referenceImages.length);
      const acceptedFiles = validFiles.slice(0, remaining);
      if (!acceptedFiles.length) {
        setError(`参考图最多支持 ${MAX_REFERENCE_IMAGES} 张`);
        setReferenceStatus(`已达到 ${MAX_REFERENCE_IMAGES} 张上限。`);
        return false;
      }

      const nextImages = acceptedFiles.map((file, index) => ({
        id: referenceImageId(index),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setReferenceImages((current) => [...current, ...nextImages]);
      setError("");
      setReferenceStatus(referenceSummary(referenceImages.length + nextImages.length));
      return true;
    },
    [referenceImages.length],
  );

  const removeReferenceImage = useCallback((id: string) => {
    setReferenceImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const nextImages = current.filter((image) => image.id !== id);
      setReferenceStatus(nextImages.length ? referenceSummary(nextImages.length) : "已移除全部参考图。");
      return nextImages;
    });
  }, []);

  const clearReferenceImages = useCallback(() => {
    setReferenceImages((current) => {
      revokeReferenceImages(current);
      return [];
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setError("");
    setReferenceStatus("已移除全部参考图。");
  }, []);

  const setReferenceFromTransfer = useCallback(
    (files: FileList | null, items: DataTransferItemList | null) => {
      const nextFiles = imageFilesFromFileList(files);
      const fallbackFiles = nextFiles.length ? [] : imageFilesFromDataTransfer(items);
      const merged = [...nextFiles, ...fallbackFiles];
      if (!merged.length) {
        return false;
      }
      return appendReferenceFiles(merged);
    },
    [appendReferenceFiles],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!access.allowed) {
      setError(access.message);
      return;
    }
    if (!selectedChannelId) {
      setError("请先选择图片通道");
      return;
    }
    if (mode === "image" && referenceImages.length === 0) {
      setError("请至少添加 1 张参考图");
      return;
    }

    setMessage("");
    setError("");
    setImages([]);
    setSubmitting(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("channelId", selectedChannelId);
    data.delete("image");
    for (const image of referenceImages) {
      data.append("image", image.file, image.file.name || "reference.png");
    }

    try {
      const response = await fetch("/api/image2", {
        method: "POST",
        body: data,
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/x-ndjson")) {
        await readImage2Stream(response);
        return;
      }

      const body = (await response.json().catch(() => ({}))) as Image2Response;
      if (!response.ok) {
        throw new Error(body.error ?? "image2 调用失败");
      }
      const nextImages = body.images ?? [];
      setImages(nextImages);
      setMessage(nextImages.length ? `生成完成，共 ${nextImages.length} 张图片。` : "接口已返回，但未发现图片字段。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "image2 调用失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function readImage2Stream(response: Response) {
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Image2Response;
      throw new Error(body.error ?? "image2 调用失败");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("image2 流式响应读取失败");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const item = parseStreamLine(line.trim());
        if (!item) {
          continue;
        }
        if (item.type === "status" && item.message) {
          setMessage(item.message);
        }
        if (item.type === "partial" && item.image) {
          setImages([item.image]);
          setMessage("已收到预览图，正在等待最终结果。");
        }
        if (item.type === "done") {
          const nextImages = item.images ?? [];
          setImages(nextImages);
          setMessage(item.message ?? (nextImages.length ? `生成完成，共 ${nextImages.length} 张图片。` : "接口已返回，但未发现图片字段。"));
          completed = true;
        }
        if (item.type === "error") {
          throw new Error(item.error ?? "image2 调用失败");
        }
      }
    }

    const tail = parseStreamLine(buffer.trim());
    if (tail?.type === "done") {
      const nextImages = tail.images ?? [];
      setImages(nextImages);
      setMessage(tail.message ?? (nextImages.length ? `生成完成，共 ${nextImages.length} 张图片。` : "接口已返回，但未发现图片字段。"));
      completed = true;
    }
    if (tail?.type === "error") {
      throw new Error(tail.error ?? "image2 调用失败");
    }
    if (!completed) {
      setMessage("image2 调用已结束。");
    }
  }

  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  useEffect(() => {
    fetch("/api/image2/access", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as Partial<Image2AccessState>;
        setAccess({
          allowed: Boolean(body.allowed),
          message: body.message ?? (response.ok ? "已获得图片工具权限" : "当前账号无权使用图片工具"),
        });
      })
      .catch(() => {
        setAccess({ allowed: false, message: "账号权限检查失败" });
      });

    fetch("/api/image2/options", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as Image2OptionsResponse;
        if (!response.ok) {
          throw new Error(body.error ?? "图片通道加载失败");
        }
        const nextChannels = body.channels ?? [];
        setChannels(nextChannels);
        setSelectedChannelId((current) => current || body.defaultChannelId || nextChannels[0]?.id || "");
      })
      .catch((err) => {
        setChannels([]);
        setError(err instanceof Error ? err.message : "图片通道加载失败");
      });
  }, []);

  useEffect(() => () => revokeReferenceImages(referenceImagesRef.current), []);

  useEffect(() => {
    function onWindowPaste(event: globalThis.ClipboardEvent) {
      if (!access.allowed) {
        event.preventDefault();
        return;
      }
      if (setReferenceFromTransfer(event.clipboardData?.files ?? null, event.clipboardData?.items ?? null)) {
        event.preventDefault();
      }
    }

    function onWindowDragOver(event: globalThis.DragEvent) {
      event.preventDefault();
    }

    function onWindowDrop(event: globalThis.DragEvent) {
      if (!access.allowed) {
        event.preventDefault();
        return;
      }
      if (setReferenceFromTransfer(event.dataTransfer?.files ?? null, event.dataTransfer?.items ?? null)) {
        event.preventDefault();
      }
    }

    window.addEventListener("paste", onWindowPaste);
    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("drop", onWindowDrop);
    return () => {
      window.removeEventListener("paste", onWindowPaste);
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("drop", onWindowDrop);
    };
  }, [access.allowed, setReferenceFromTransfer]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (!access.allowed) {
      setError(access.message);
      return;
    }
    const nextFiles = imageFilesFromFileList(event.currentTarget.files);
    if (!nextFiles.length) {
      setReferenceStatus("已打开文件选择器，但没有选中图片。");
      return;
    }
    appendReferenceFiles(nextFiles);
    event.currentTarget.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!access.allowed) {
      setError(access.message);
      return;
    }
    if (setReferenceFromTransfer(event.dataTransfer.files, event.dataTransfer.items)) {
      return;
    }
    setReferenceStatus("已收到拖入内容，正在读取图片。");
    filesFromClipboardText(event.dataTransfer.getData("text/html") || event.dataTransfer.getData("text/plain"))
      .then((files) => {
        if (files.length) {
          appendReferenceFiles(files);
        } else {
          setReferenceStatus("拖入内容里没有可读取的图片。");
        }
      })
      .catch(() => {
        setReferenceStatus("拖入图片读取失败。");
        setError("拖入图片读取失败");
      });
  }

  function onPaste(event: ClipboardEvent<HTMLElement>) {
    if (!access.allowed) {
      event.preventDefault();
      setError(access.message);
      return;
    }
    if (setReferenceFromTransfer(event.clipboardData.files, event.clipboardData.items)) {
      event.preventDefault();
      return;
    }
    const text = event.clipboardData.getData("text/html") || event.clipboardData.getData("text/plain");
    if (text.trim()) {
      event.preventDefault();
      setReferenceStatus("已收到粘贴内容，正在读取图片。");
      filesFromClipboardText(text)
        .then((files) => {
          if (files.length) {
            appendReferenceFiles(files);
          } else {
            setReferenceStatus("粘贴内容里没有可读取的图片。");
            setError("剪贴板里没有可读取的图片");
          }
        })
        .catch(() => {
          setReferenceStatus("剪贴板图片读取失败。");
          setError("剪贴板图片读取失败");
        });
      return;
    }
    setReferenceStatus("已触发粘贴，但剪贴板没有图片数据。");
  }

  async function readClipboardImage() {
    if (!access.allowed) {
      setError(access.message);
      return;
    }
    setError("");
    setReferenceStatus("正在请求读取剪贴板图片。");
    try {
      if (!navigator.clipboard?.read) {
        throw new Error("当前浏览器不支持直接读取剪贴板图片");
      }
      const items = await navigator.clipboard.read();
      const nextFiles: File[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (!type.startsWith("image/")) {
            continue;
          }
          const blob = await item.getType(type);
          nextFiles.push(new File([blob], `clipboard-image.${extensionFromType(type)}`, { type }));
        }
      }
      if (!nextFiles.length) {
        throw new Error("剪贴板里没有图片");
      }
      appendReferenceFiles(nextFiles);
    } catch (err) {
      setReferenceStatus("直接读取剪贴板图片失败。");
      setError(err instanceof Error ? err.message : "读取剪贴板图片失败");
    }
  }

  return (
    <div className="page image2-page">
      <section className="section-hero">
        <span className="eyebrow">MULTI CHANNEL IMAGE2</span>
        <h1>image2 图片工具</h1>
        <p>支持多个站点通道切换，统一接入 gpt-image-2 兼容图片接口。文生图调用 `/v1/images/generations`，图生图调用 `/v1/images/edits`。</p>
      </section>

      <section className="section image2-workbench">
        <form className="form image2-form" data-disabled={access.allowed ? "false" : "true"} onSubmit={onSubmit}>
          {!access.allowed ? <div className="message image2-lock-message">{access.message}</div> : null}

          <div className="field">
            <label htmlFor="channelId">站点通道</label>
            <select
              id="channelId"
              name="channelId"
              value={selectedChannelId}
              disabled={!access.allowed || submitting || channels.length === 0}
              onChange={(event) => setSelectedChannelId(event.currentTarget.value)}
            >
              {channels.length ? (
                channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))
              ) : (
                <option value="">暂无可用通道</option>
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor="mode">模式</label>
            <select
              id="mode"
              name="mode"
              value={mode}
              disabled={!access.allowed || submitting}
              onChange={(event) => setMode(event.currentTarget.value as ModeValue)}
            >
              {modeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="prompt">提示词</label>
            <textarea id="prompt" name="prompt" rows={7} required disabled={!access.allowed || submitting} placeholder={examplePrompt} />
          </div>

          <div className="field">
            <label htmlFor="image">参考图</label>
            <div
              className="image-dropzone"
              data-active={mode === "image" ? "true" : "false"}
              data-disabled={access.allowed ? "false" : "true"}
              data-testid="image-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onClick={() => {
                if (access.allowed) {
                  fileInputRef.current?.click();
                }
              }}
              onDrop={onDrop}
              onPaste={onPaste}
              tabIndex={access.allowed ? 0 : -1}
              aria-disabled={!access.allowed}
            >
              {referenceImages.length ? (
                <div className="image-preview-grid">
                  {referenceImages.map((image, index) => (
                    <div className="image-preview-wrap image-preview-tile" key={image.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="image-dropzone-preview"
                        src={image.previewUrl}
                        alt={`参考图预览 ${index + 1}`}
                        data-testid="reference-preview"
                      />
                      <button
                        className="image-preview-remove"
                        type="button"
                        disabled={!access.allowed || submitting}
                        aria-label={`删除参考图 ${index + 1}`}
                        title={`删除参考图 ${index + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeReferenceImage(image.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div
                className="image-paste-target"
                contentEditable={access.allowed}
                suppressContentEditableWarning
                aria-label="参考图片区"
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDrop}
                onPaste={onPaste}
              >
                {referenceImages.length
                  ? `当前已选择 ${referenceImages.length} 张参考图，最多支持 ${MAX_REFERENCE_IMAGES} 张。`
                  : "点击这里后按 Ctrl+V、拖拽图片到此处，或一次选择多张图片。"}
              </div>

              <div className="image-upload-actions">
                <label
                  className="button image-file-button"
                  htmlFor={access.allowed ? "image" : undefined}
                  aria-disabled={!access.allowed}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!access.allowed) {
                      event.preventDefault();
                    }
                  }}
                >
                  选择参考图
                </label>
                <button
                  className="ghost-button image-file-button"
                  type="button"
                  disabled={!access.allowed || submitting}
                  onClick={(event) => {
                    event.stopPropagation();
                    readClipboardImage();
                  }}
                >
                  读取剪贴板图片
                </button>
              </div>

              <input
                id="image"
                ref={fileInputRef}
                className="image-file-input-hidden"
                name="image"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                disabled={!access.allowed || submitting}
                onChange={onFileChange}
              />

              {referenceImages.length ? (
                <button
                  className="text-button"
                  type="button"
                  disabled={!access.allowed || submitting}
                  onClick={(event) => {
                    event.stopPropagation();
                    clearReferenceImages();
                  }}
                >
                  清空参考图
                </button>
              ) : null}

              <span>
                {referenceStatus ||
                  (referenceImages.length
                    ? referenceSummary(referenceImages.length)
                    : mode === "image"
                      ? `图生图支持多张参考图，最多 ${MAX_REFERENCE_IMAGES} 张。`
                      : "文生图会忽略参考图，切到图生图后再使用。")}
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="size">图片规格</label>
              <select id="size" name="size" defaultValue="1:1" disabled={!access.allowed || submitting}>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="n">张数</label>
              <input id="n" name="n" type="number" min="1" max="4" defaultValue="1" disabled={!access.allowed || submitting} />
            </div>
          </div>

          <div className="form-actions">
            <button className="button" type="submit" disabled={toolDisabled}>
              {submitting ? "正在生成..." : "调用 image2"}
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={!access.allowed || submitting}
              onClick={() => {
                setImages([]);
                setMessage("");
                setError("");
              }}
            >
              清空结果
            </button>
          </div>

          {message ? <div className="message">{message}</div> : null}
          {error ? <div className="message error">{error}</div> : null}
        </form>

        <div className="image2-results" aria-live="polite">
          {images.length ? (
            images.map((image, index) => (
              <figure className="image2-result" key={`${image.url}-${index}`}>
                <Image
                  src={imageSrc(image)}
                  alt={`image2 生成结果 ${index + 1}`}
                  width={768}
                  height={768}
                  unoptimized
                />
                <figcaption>
                  <span>结果 {index + 1}</span>
                  <a className="ghost-button" href={downloadHref(image)} download={`image2-${index + 1}.png`}>
                    下载到本地
                  </a>
                </figcaption>
              </figure>
            ))
          ) : (
            <div className="image2-empty">
              <span className="badge">{currentChannel?.name ?? "gpt-image-2"}</span>
              <p>生成后的图片会显示在这里。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
