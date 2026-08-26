"use client";

import Image from "next/image";
import { type FormEvent, useState } from "react";
import type { HomepageAsset, HomepageAward, HomepageContentData, HomepageProfile, HomepageQuote, HomepageRecruitmentBanner } from "@/lib/api";

type AdminHomepageContentProps = {
  initialData: HomepageContentData;
};

type SubmitKind = "save-banner" | "save-campus-banner" | "save-profile" | "upload-award" | "upload-asset" | "save-asset" | "delete-asset" | "create-quote" | "save-quote" | "delete-quote";

type AwardEditor = HomepageAward & { editorId: string };

function awardEditors(profile: HomepageProfile): AwardEditor[] {
  return profile.awards.map((award, index) => ({
    ...award,
    display_order: index + 1,
    editorId: `award-${index}-${award.image_url}`,
  }));
}

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
  const [profile, setProfile] = useState(initialData.profile);
  const [awards, setAwards] = useState<AwardEditor[]>(() => awardEditors(initialData.profile));
  const [recruitmentBanner, setRecruitmentBanner] = useState<HomepageRecruitmentBanner>(() => initialData.recruitment_banner ?? {
    text: "2027赛季招新中",
    action_text: "点击跳转",
    is_enabled: false,
    updated_at: "",
  });
  const [campusBanner, setCampusBanner] = useState<HomepageRecruitmentBanner>(() => initialData.campus_banner ?? {
    text: "2027贵州大学机甲大师校内赛",
    action_text: "由此报名",
    is_enabled: false,
    updated_at: "",
  });
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
      if (kind === "save-banner") {
        const banner = await submitHomepageForm<HomepageRecruitmentBanner>(form);
        setRecruitmentBanner(banner);
        setFeedback({ type: "ok", text: "招新公告栏已保存" });
        return;
      }

      if (kind === "save-campus-banner") {
        const banner = await submitHomepageForm<HomepageRecruitmentBanner>(form);
        setCampusBanner(banner);
        setFeedback({ type: "ok", text: "校内赛公告栏已保存" });
        return;
      }

      if (kind === "save-profile") {
        const updatedProfile = await submitHomepageForm<HomepageProfile>(form);
        setProfile(updatedProfile);
        setAwards(awardEditors(updatedProfile));
        setFeedback({ type: "ok", text: "首页基础内容已保存" });
        return;
      }

      if (kind === "upload-award") {
        const updatedProfile = await submitHomepageForm<HomepageProfile>(form);
        setProfile(updatedProfile);
        setAwards(awardEditors(updatedProfile));
        form.reset();
        setFeedback({ type: "ok", text: "荣誉图片已上传" });
        return;
      }

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

  const removeAward = (editorId: string) => {
    setAwards((current) => current
      .filter((award) => award.editorId !== editorId)
      .map((award, index) => ({ ...award, display_order: index + 1 })));
  };

  const updateAwardOrder = (editorId: string, displayOrder: number) => {
    setAwards((current) => current.map((award) => (
      award.editorId === editorId ? { ...award, display_order: displayOrder } : award
    )));
  };

  return (
    <section className="section admin-section">
      <div className="section-heading">
        <span className="eyebrow">HOME</span>
        <h2>首页内容管理</h2>
      </div>

      {feedback ? <div className={`message admin-feedback${feedback.type === "error" ? " error" : ""}`}>{feedback.text}</div> : null}

      <form className="form admin-content-form admin-recruitment-banner-form" action="/api/admin/homepage/recruitment-banner" method="post" onSubmit={(event) => handleSubmit(event, "save-banner")}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">RECRUITMENT BANNER</span>
            <h3>首页招新公告栏</h3>
          </div>
          <label className="account-switch">
            <input name="is_enabled" type="checkbox" defaultChecked={recruitmentBanner.is_enabled} value="true" />
            首页显示
          </label>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="home-recruitment-banner-text">主文案</label>
            <input id="home-recruitment-banner-text" name="text" defaultValue={recruitmentBanner.text} maxLength={120} required />
          </div>
          <div className="field">
            <label htmlFor="home-recruitment-banner-action">栏尾文案</label>
            <input id="home-recruitment-banner-action" name="action_text" defaultValue={recruitmentBanner.action_text} maxLength={32} required />
          </div>
        </div>
        <button className="button" type="submit" disabled={isBusy("save-banner", "/api/admin/homepage/recruitment-banner")}>
          保存招新公告栏
        </button>
      </form>

      <form className="form admin-content-form admin-recruitment-banner-form" action="/api/admin/homepage/campus-banner" method="post" onSubmit={(event) => handleSubmit(event, "save-campus-banner")}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">CAMPUS COMPETITION BANNER</span>
            <h3>首页校内赛公告栏</h3>
          </div>
          <label className="account-switch">
            <input name="is_enabled" type="checkbox" defaultChecked={campusBanner.is_enabled} value="true" />
            首页显示
          </label>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="home-campus-banner-text">主文案</label>
            <input id="home-campus-banner-text" name="text" defaultValue={campusBanner.text} maxLength={120} required />
          </div>
          <div className="field">
            <label htmlFor="home-campus-banner-action">栏尾文案</label>
            <input id="home-campus-banner-action" name="action_text" defaultValue={campusBanner.action_text} maxLength={32} required />
          </div>
        </div>
        <button className="button" type="submit" disabled={isBusy("save-campus-banner", "/api/admin/homepage/campus-banner")}>
          保存校内赛公告栏
        </button>
      </form>

      <form className="form admin-content-form admin-home-profile-form" action="/api/admin/homepage/profile" method="post" onSubmit={(event) => handleSubmit(event, "save-profile") }>
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOMEPAGE PROFILE</span>
            <h3>战队介绍与首页概览</h3>
          </div>
          <button className="button" type="submit" disabled={isBusy("save-profile", "/api/admin/homepage/profile") }>
            保存首页基础内容
          </button>
        </div>

        <div className="admin-home-settings-grid">
          <fieldset className="admin-home-editor-card admin-home-identity-card">
            <legend>战队名与简介</legend>
            <div className="field">
              <label htmlFor="home-team-name">战队名</label>
              <input id="home-team-name" name="team_name" defaultValue={profile.team_name} maxLength={80} required />
            </div>
            <div className="field">
              <label htmlFor="home-team-intro">战队简介</label>
              <textarea id="home-team-intro" name="team_intro" defaultValue={profile.team_intro} rows={5} maxLength={1000} required />
            </div>
          </fieldset>

          <fieldset className="admin-home-editor-card">
            <legend>首页概览小窗口</legend>
            <div className="admin-home-stat-grid">
              {profile.stats.map((stat, index) => (
                <div className="admin-home-stat-editor" key={`${stat.label}-${index}`}>
                  <div className="field">
                    <label htmlFor={`home-stat-value-${index}`}>数值</label>
                    <input id={`home-stat-value-${index}`} name="stat_value" defaultValue={stat.value} maxLength={24} required />
                  </div>
                  <div className="field">
                    <label htmlFor={`home-stat-label-${index}`}>名称</label>
                    <input id={`home-stat-label-${index}`} name="stat_label" defaultValue={stat.label} maxLength={32} required />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="admin-home-editor-card admin-home-recruitment-editor">
            <legend>首页底部招新栏目</legend>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="home-recruitment-season-label">赛季标签</label>
                <input id="home-recruitment-season-label" name="recruitment_season_label" defaultValue={profile.recruitment.season_label} maxLength={40} required />
              </div>
              <div className="field">
                <label htmlFor="home-recruitment-title">主标题</label>
                <textarea id="home-recruitment-title" name="recruitment_title" defaultValue={profile.recruitment.title} rows={2} maxLength={120} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="home-recruitment-intro">引导文案</label>
              <textarea id="home-recruitment-intro" name="recruitment_intro" defaultValue={profile.recruitment.intro} rows={3} maxLength={500} required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="home-recruitment-event-kicker">赛事栏目标签</label>
                <input id="home-recruitment-event-kicker" name="recruitment_event_kicker" defaultValue={profile.recruitment.event_kicker} maxLength={60} required />
              </div>
              <div className="field">
                <label htmlFor="home-recruitment-event-title">赛事介绍标题</label>
                <input id="home-recruitment-event-title" name="recruitment_event_title" defaultValue={profile.recruitment.event_title} maxLength={100} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="home-recruitment-event-description">赛事介绍正文</label>
              <textarea id="home-recruitment-event-description" name="recruitment_event_description" defaultValue={profile.recruitment.event_description} rows={5} maxLength={1000} required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="home-recruitment-groups-kicker">组别栏目标签</label>
                <input id="home-recruitment-groups-kicker" name="recruitment_groups_kicker" defaultValue={profile.recruitment.groups_kicker} maxLength={60} required />
              </div>
              <div className="field">
                <label htmlFor="home-recruitment-groups-title">组别标题</label>
                <input id="home-recruitment-groups-title" name="recruitment_groups_title" defaultValue={profile.recruitment.groups_title} maxLength={100} required />
              </div>
            </div>
            <div className="admin-home-recruitment-groups">
              {profile.recruitment.groups.map((group, index) => (
                <article className="admin-home-stat-editor" key={`${group.name}-${index}`}>
                  <strong>组别 {index + 1}</strong>
                  <div className="field">
                    <label htmlFor={`home-recruitment-group-name-${index}`}>名称</label>
                    <input id={`home-recruitment-group-name-${index}`} name="recruitment_group_name" defaultValue={group.name} maxLength={40} required />
                  </div>
                  <div className="field">
                    <label htmlFor={`home-recruitment-group-summary-${index}`}>说明</label>
                    <textarea id={`home-recruitment-group-summary-${index}`} name="recruitment_group_summary" defaultValue={group.summary} rows={2} maxLength={240} required />
                  </div>
                </article>
              ))}
            </div>
            <div className="field">
              <label htmlFor="home-recruitment-qr-text">二维码提示</label>
              <input id="home-recruitment-qr-text" name="recruitment_qr_text" defaultValue={profile.recruitment.qr_text} maxLength={100} required />
            </div>
          </fieldset>

          <fieldset className="admin-home-editor-card admin-home-awards-editor">
            <legend>奖项与荣誉展示</legend>
            <div className="admin-home-awards-toolbar">
              <p>首页按连续序号展示，新增内容请使用下方“上传荣誉图片”。</p>
            </div>
            <div className="admin-home-awards-grid">
              {awards.map((award, index) => (
                <article className="admin-home-award-editor" key={award.editorId}>
                  <div className="admin-home-award-heading">
                    <strong>荣誉 {index + 1}</strong>
                    <button className="text-button" type="button" onClick={() => removeAward(award.editorId)}>
                      移除
                    </button>
                  </div>
                  <div className="field">
                    <label htmlFor={`home-award-title-${index}`}>名称</label>
                    <input id={`home-award-title-${index}`} name="award_title" defaultValue={award.title} maxLength={100} required />
                  </div>
                  <div className="field">
                    <label htmlFor={`home-award-meta-${index}`}>说明</label>
                    <textarea id={`home-award-meta-${index}`} name="award_meta" defaultValue={award.meta} rows={2} maxLength={240} />
                  </div>
                  <input name="award_image_url" type="hidden" value={award.image_url} readOnly />
                  {award.image_url ? (
                    <div className="admin-home-award-preview">
                      <Image src={award.image_url} alt={award.image_alt || award.title} width={480} height={300} />
                      <span>当前图片</span>
                    </div>
                  ) : null}
                  <div className="field">
                    <label htmlFor={`home-award-alt-${index}`}>图片说明</label>
                    <input id={`home-award-alt-${index}`} name="award_image_alt" defaultValue={award.image_alt} maxLength={160} />
                  </div>
                  <div className="field">
                    <label htmlFor={`home-award-order-${index}`}>排序</label>
                    <input
                      id={`home-award-order-${index}`}
                      name="award_display_order"
                      type="number"
                      min="1"
                      max="12"
                      value={award.display_order}
                      onChange={(event) => updateAwardOrder(award.editorId, Number(event.target.value))}
                      required
                    />
                  </div>
                </article>
              ))}
            </div>
          </fieldset>
        </div>
      </form>

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

        <form className="form admin-content-form" action="/api/admin/homepage/awards" method="post" encType="multipart/form-data" onSubmit={(event) => handleSubmit(event, "upload-award")}>
          <h3>上传荣誉图片</h3>
          <div className="field">
            <label htmlFor="home-award-upload-file">图片文件</label>
            <input id="home-award-upload-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="home-award-upload-title">荣誉名称</label>
              <input id="home-award-upload-title" name="title" maxLength={100} required />
            </div>
            <div className="field">
              <label htmlFor="home-award-upload-order">排序</label>
              <input id="home-award-upload-order" name="display_order" type="number" min="1" max="12" defaultValue={awards.length + 1} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="home-award-upload-meta">荣誉说明</label>
            <textarea id="home-award-upload-meta" name="meta" rows={2} maxLength={240} />
          </div>
          <div className="field">
            <label htmlFor="home-award-upload-alt">图片说明</label>
            <input id="home-award-upload-alt" name="image_alt" maxLength={160} placeholder="用于无障碍说明" />
          </div>
          <button className="button" type="submit" disabled={isBusy("upload-award", "/api/admin/homepage/awards") || awards.length >= 12}>
            上传荣誉图片
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
