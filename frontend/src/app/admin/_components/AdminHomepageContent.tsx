"use client";

import Image from "next/image";
import { type FormEvent, useState } from "react";
import type { HomepageAsset, HomepageContentData, HomepageQuote } from "@/lib/api";

type AdminHomepageContentProps = {
  initialData: HomepageContentData;
};

type SubmitKind = "upload-asset" | "save-asset" | "delete-asset" | "create-quote" | "save-quote" | "delete-quote";

function formatDateTime(value: unknown) {
  if (!value) {
    return "未记录";
  }
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(String(value)));
  } catch {
    return String(value);
  }
}

function formatFileSize(value: number) {
  if (!value) {
    return "内置资源";
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function sortAssets(items: HomepageAsset[]) {
  return [...items].sort((left, right) => left.display_order - right.display_order || left.created_at.localeCompare(right.created_at));
}

function sortQuotes(items: HomepageQuote[]) {
  return [...items].sort((left, right) => left.display_order - right.display_order || left.created_at.localeCompare(right.created_at));
}

function formAction(form: HTMLFormElement) {
  return form.getAttribute("action") || form.action;
}

async function submitHomepageForm<T>(form: HTMLFormElement): Promise<T> {
  const response = await fetch(form.action, {
    method: form.method || "POST",
    headers: {
      Accept: "application/json",
      "X-Admin-Async": "true",
    },
    body: new FormData(form),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(body.detail ?? "保存失败"));
  }
  return body as T;
}

export function AdminHomepageContent({ initialData }: AdminHomepageContentProps) {
  const [videos, setVideos] = useState(() => sortAssets(initialData.videos));
  const [images, setImages] = useState(() => sortAssets(initialData.images));
  const [quotes, setQuotes] = useState(() => sortQuotes(initialData.quotes));
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busyForm, setBusyForm] = useState("");

  const applyAsset = (asset: HomepageAsset) => {
    if (asset.kind === "video") {
      setVideos((current) =>
        sortAssets(
          [asset, ...current.filter((item) => item.id !== asset.id)].map((item) =>
            item.id === asset.id || !asset.is_enabled ? item : { ...item, is_enabled: false },
          ),
        ),
      );
      return;
    }
    setImages((current) => sortAssets([asset, ...current.filter((item) => item.id !== asset.id)]));
  };

  const removeAsset = (assetId: string, kind: HomepageAsset["kind"]) => {
    if (kind === "video") {
      setVideos((current) => current.filter((item) => item.id !== assetId));
      return;
    }
    setImages((current) => current.filter((item) => item.id !== assetId));
  };

  const applyQuote = (quote: HomepageQuote) => {
    setQuotes((current) => sortQuotes([quote, ...current.filter((item) => item.id !== quote.id)]));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>, kind: SubmitKind) => {
    event.preventDefault();
    const form = event.currentTarget;
    const action = formAction(form);
    const formKey = `${kind}-${action}-${String(form.dataset.id ?? "")}`;
    setBusyForm(formKey);
    setFeedback(null);

    try {
      if (kind === "upload-asset" || kind === "save-asset") {
        const asset = await submitHomepageForm<HomepageAsset>(form);
        applyAsset(asset);
        form.reset();
        setFeedback({ type: "ok", text: kind === "upload-asset" ? "媒体已上传" : "媒体已保存" });
        return;
      }

      if (kind === "delete-asset") {
        await submitHomepageForm<{ message?: string }>(form);
        removeAsset(String(form.dataset.id ?? ""), form.dataset.kind === "video" ? "video" : "image");
        setFeedback({ type: "ok", text: "媒体已删除" });
        return;
      }

      if (kind === "create-quote" || kind === "save-quote") {
        const quote = await submitHomepageForm<HomepageQuote>(form);
        applyQuote(quote);
        if (kind === "create-quote") {
          form.reset();
        }
        setFeedback({ type: "ok", text: kind === "create-quote" ? "文案已新建" : "文案已保存" });
        return;
      }

      await submitHomepageForm<{ message?: string }>(form);
      setQuotes((current) => current.filter((item) => item.id !== form.dataset.id));
      setFeedback({ type: "ok", text: "文案已删除" });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "保存失败" });
    } finally {
      setBusyForm("");
    }
  };

  const isBusy = (kind: SubmitKind, action: string, id = "") => busyForm === `${kind}-${action}-${id}`;

  return (
    <section className="section admin-section">
      <div className="section-heading">
        <span className="eyebrow">HOME</span>
        <h2>首页内容管理</h2>
      </div>

      {feedback ? <div className={`message admin-feedback${feedback.type === "error" ? " error" : ""}`}>{feedback.text}</div> : null}

      <div className="admin-content-grid">
        <form className="form admin-content-form" action="/api/admin/homepage/assets" method="post" encType="multipart/form-data" onSubmit={(event) => handleSubmit(event, "upload-asset")}>
          <h3>上传赛季宣传视频</h3>
          <input name="kind" type="hidden" value="video" />
          <div className="field">
            <label htmlFor="home-video-file">视频文件</label>
            <input id="home-video-file" name="file" type="file" accept="video/mp4,video/webm,video/quicktime" required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="home-video-alt">视频说明</label>
              <input id="home-video-alt" name="alt" defaultValue="赛季宣传视频" />
            </div>
            <div className="field">
              <label htmlFor="home-video-order">排序</label>
              <input id="home-video-order" name="display_order" type="number" min="0" max="9999" defaultValue="1" />
            </div>
          </div>
          <button className="button" type="submit" disabled={isBusy("upload-asset", "/api/admin/homepage/assets")}>
            上传并启用视频
          </button>
        </form>

        <form className="form admin-content-form" action="/api/admin/homepage/assets" method="post" encType="multipart/form-data" onSubmit={(event) => handleSubmit(event, "upload-asset")}>
          <h3>上传轮播图片</h3>
          <input name="kind" type="hidden" value="image" />
          <div className="field">
            <label htmlFor="home-image-file">图片文件</label>
            <input id="home-image-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="home-image-alt">图片说明</label>
              <input id="home-image-alt" name="alt" placeholder="用于无障碍说明" />
            </div>
            <div className="field">
              <label htmlFor="home-image-order">排序</label>
              <input id="home-image-order" name="display_order" type="number" min="0" max="9999" defaultValue="20" />
            </div>
          </div>
          <button className="button" type="submit" disabled={isBusy("upload-asset", "/api/admin/homepage/assets")}>
            上传图片
          </button>
        </form>

        <form className="form admin-content-form" action="/api/admin/homepage/quotes" method="post" onSubmit={(event) => handleSubmit(event, "create-quote")}>
          <h3>新增轮播文案</h3>
          <div className="field">
            <label htmlFor="home-quote-text">文案</label>
            <textarea id="home-quote-text" name="text" rows={3} maxLength={120} required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="home-quote-source">来源</label>
              <input id="home-quote-source" name="source" maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="home-quote-order">排序</label>
              <input id="home-quote-order" name="display_order" type="number" min="0" max="9999" defaultValue="20" />
            </div>
          </div>
          <label className="account-switch">
            <input name="is_enabled" type="checkbox" defaultChecked value="true" />
            启用
          </label>
          <button className="button" type="submit" disabled={isBusy("create-quote", "/api/admin/homepage/quotes")}>
            新建文案
          </button>
        </form>
      </div>

      <div className="section-heading admin-subheading">
        <span className="eyebrow">VIDEOS</span>
        <h3>视频列表</h3>
      </div>
      <div className="table-wrap">
        <table className="admin-home-table">
          <thead>
            <tr>
              <th>文件</th>
              <th>说明</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((asset) => {
              const formId = `home-video-${asset.id}`;
              const action = `/api/admin/homepage/assets/${encodeURIComponent(asset.id)}`;
              return (
                <tr key={asset.id}>
                  <td>
                    <strong>{asset.original_filename || asset.url}</strong>
                    <div>{formatFileSize(asset.size_bytes)}</div>
                    <div>{formatDateTime(asset.updated_at)}</div>
                    <form id={formId} action={action} method="post" onSubmit={(event) => handleSubmit(event, "save-asset")} />
                  </td>
                  <td>
                    <input form={formId} name="alt" defaultValue={asset.alt} />
                  </td>
                  <td>
                    <input form={formId} name="display_order" type="number" min="0" max="9999" defaultValue={asset.display_order} />
                  </td>
                  <td>
                    <label className="account-switch">
                      <input form={formId} name="is_enabled" type="checkbox" defaultChecked={asset.is_enabled} value="true" />
                      启用
                    </label>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="ghost-button" form={formId} type="submit" disabled={isBusy("save-asset", action)}>
                        保存
                      </button>
                      <form action={action} method="post" data-id={asset.id} data-kind="video" onSubmit={(event) => handleSubmit(event, "delete-asset")}>
                        <input name="intent" type="hidden" value="delete" />
                        <button className="ghost-button" type="submit" disabled={isBusy("delete-asset", action, asset.id)}>
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section-heading admin-subheading">
        <span className="eyebrow">QUOTES</span>
        <h3>文案列表</h3>
      </div>
      <div className="table-wrap">
        <table className="admin-home-table">
          <thead>
            <tr>
              <th>文案</th>
              <th>来源</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => {
              const formId = `home-quote-${quote.id}`;
              const action = `/api/admin/homepage/quotes/${encodeURIComponent(quote.id)}`;
              return (
                <tr key={quote.id}>
                  <td>
                    <textarea form={formId} name="text" defaultValue={quote.text} rows={3} maxLength={120} />
                    <form id={formId} action={action} method="post" onSubmit={(event) => handleSubmit(event, "save-quote")} />
                  </td>
                  <td>
                    <input form={formId} name="source" defaultValue={quote.source} maxLength={80} />
                  </td>
                  <td>
                    <input form={formId} name="display_order" type="number" min="0" max="9999" defaultValue={quote.display_order} />
                  </td>
                  <td>
                    <label className="account-switch">
                      <input form={formId} name="is_enabled" type="checkbox" defaultChecked={quote.is_enabled} value="true" />
                      启用
                    </label>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="ghost-button" form={formId} type="submit" disabled={isBusy("save-quote", action)}>
                        保存
                      </button>
                      <form action={action} method="post" data-id={quote.id} onSubmit={(event) => handleSubmit(event, "delete-quote")}>
                        <input name="intent" type="hidden" value="delete" />
                        <button className="ghost-button" type="submit" disabled={isBusy("delete-quote", action, quote.id)}>
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section-heading admin-subheading">
        <span className="eyebrow">IMAGES</span>
        <h3>图片列表</h3>
      </div>
      <div className="table-wrap">
        <table className="admin-home-table">
          <thead>
            <tr>
              <th>预览</th>
              <th>说明</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((asset) => {
              const formId = `home-image-${asset.id}`;
              const action = `/api/admin/homepage/assets/${encodeURIComponent(asset.id)}`;
              return (
                <tr key={asset.id}>
                  <td>
                    <Image className="admin-home-thumb" src={asset.url} alt={asset.alt || "轮播图片"} width={160} height={90} />
                    <div>{asset.original_filename || asset.url}</div>
                    <form id={formId} action={action} method="post" onSubmit={(event) => handleSubmit(event, "save-asset")} />
                  </td>
                  <td>
                    <input form={formId} name="alt" defaultValue={asset.alt} />
                  </td>
                  <td>
                    <input form={formId} name="display_order" type="number" min="0" max="9999" defaultValue={asset.display_order} />
                  </td>
                  <td>
                    <label className="account-switch">
                      <input form={formId} name="is_enabled" type="checkbox" defaultChecked={asset.is_enabled} value="true" />
                      启用
                    </label>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="ghost-button" form={formId} type="submit" disabled={isBusy("save-asset", action)}>
                        保存
                      </button>
                      <form action={action} method="post" data-id={asset.id} data-kind="image" onSubmit={(event) => handleSubmit(event, "delete-asset")}>
                        <input name="intent" type="hidden" value="delete" />
                        <button className="ghost-button" type="submit" disabled={isBusy("delete-asset", action, asset.id)}>
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
