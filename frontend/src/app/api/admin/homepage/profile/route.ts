import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError, wantsJsonResponse } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const adminPath = adminReturnPath(request, "/admin/homepage");
  const wantsJson = wantsJsonResponse(request);
  const [form, cookieStore] = await Promise.all([request.formData(), cookies()]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) {
    if (wantsJson) return Response.json({ detail: "请先登录管理员后台" }, { status: 401 });
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }

  const statValues = form.getAll("stat_value");
  const statLabels = form.getAll("stat_label");
  const awardTitles = form.getAll("award_title");
  const awardMetas = form.getAll("award_meta");
  const awardImageUrls = form.getAll("award_image_url");
  const awardImageAlts = form.getAll("award_image_alt");
  const awardDisplayOrders = form.getAll("award_display_order");
  const recruitmentGroupNames = form.getAll("recruitment_group_name");
  const recruitmentGroupSummaries = form.getAll("recruitment_group_summary");
  const recruitmentEventIds = form.getAll("recruitment_event_id");
  const recruitmentEventNames = form.getAll("recruitment_event_name");
  const recruitmentEventKickers = form.getAll("recruitment_event_kicker");
  const recruitmentEventTitles = form.getAll("recruitment_event_title");
  const recruitmentEventDescriptions = form.getAll("recruitment_event_description");
  const recruitmentEvents = recruitmentEventIds.map((id, index) => ({
    id: String(id),
    name: String(recruitmentEventNames[index] ?? ""),
    kicker: String(recruitmentEventKickers[index] ?? ""),
    title: String(recruitmentEventTitles[index] ?? ""),
    description: String(recruitmentEventDescriptions[index] ?? ""),
  }));
  const awards = awardTitles.map((title, index) => ({
    title: String(title),
    meta: String(awardMetas[index] ?? ""),
    image_url: String(awardImageUrls[index] ?? ""),
    image_alt: String(awardImageAlts[index] ?? ""),
    display_order: Number(awardDisplayOrders[index] ?? index + 1),
  }));

  const response = await fetch(`${API_BASE}/api/admin/homepage/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      team_name: String(form.get("team_name") ?? ""),
      team_intro: String(form.get("team_intro") ?? ""),
      stats: statValues.map((value, index) => ({ value: String(value), label: String(statLabels[index] ?? "") })),
      awards,
      recruitment: {
        season_label: String(form.get("recruitment_season_label") ?? ""),
        title: String(form.get("recruitment_title") ?? ""),
        intro: String(form.get("recruitment_intro") ?? ""),
        event_kicker: recruitmentEvents[0]?.kicker ?? "",
        event_title: recruitmentEvents[0]?.title ?? "",
        event_description: recruitmentEvents[0]?.description ?? "",
        events: recruitmentEvents,
        groups_kicker: String(form.get("recruitment_groups_kicker") ?? ""),
        groups_title: String(form.get("recruitment_groups_title") ?? ""),
        groups: recruitmentGroupNames.map((name, index) => ({
          name: String(name),
          summary: String(recruitmentGroupSummaries[index] ?? ""),
        })),
        qr_text: String(form.get("recruitment_qr_text") ?? ""),
      },
    }),
  });

  if (!response.ok) {
    const detail = await responseError(response, "首页基础内容保存失败");
    if (wantsJson) return Response.json({ detail }, { status: response.status });
    redirect(feedbackPath(adminPath, "error", detail));
  }
  if (wantsJson) return Response.json(await response.json(), { status: response.status });
  redirect(feedbackPath(adminPath, "ok", "首页基础内容已保存"));
}
