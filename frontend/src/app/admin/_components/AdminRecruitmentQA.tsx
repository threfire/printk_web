"use client";

import { useState, type FormEvent } from "react";
import type { RecruitmentFaq, RecruitmentQuestion } from "@/lib/api";

function readableError(value: unknown, fallback: string) {
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value)) {
    const messages = value.map((item) => {
      if (item && typeof item === "object" && "msg" in item) return String(item.msg);
      return typeof item === "string" ? item : "";
    }).filter(Boolean);
    if (messages.length) return messages.join("；");
  }
  if (value && typeof value === "object" && "msg" in value) return readableError(value.msg, fallback);
  if (value && typeof value === "object") {
    try { return JSON.stringify(value); } catch { return fallback; }
  }
  return fallback;
}

async function submit(form: HTMLFormElement, method: string) {
  const formData = new FormData(form);
  const response = await fetch(form.action, { method, body: formData });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readableError(body.detail, "保存失败"));
  const item = body && typeof body === "object" && "message" in body && body.message && typeof body.message === "object"
    ? body.message
    : body;
  if (!item || typeof item !== "object" || !("id" in item)) {
    return {
      id: `local-${Date.now()}`,
      question: String(formData.get("question") ?? ""),
      answer: String(formData.get("answer") ?? ""),
      display_order: Number(formData.get("display_order") ?? 0),
      is_enabled: String(formData.get("is_enabled") ?? "") === "true",
      created_at: "",
      updated_at: "",
    };
  }
  return item as RecruitmentFaq;
}

export function AdminRecruitmentQA({ initialFaqs, questions }: { initialFaqs: RecruitmentFaq[]; questions: RecruitmentQuestion[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [feedback, setFeedback] = useState("");

  async function saveFaq(event: FormEvent<HTMLFormElement>, faqId?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const item = await submit(form, faqId ? "PUT" : "POST");
      setFaqs((current) => [...current.filter((faq) => faq.id !== item.id), item].sort((a, b) => a.display_order - b.display_order));
      if (!faqId) form.reset();
      setFeedback("QA 已保存");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "保存失败");
    }
  }

  async function deleteFaq(faqId: string) {
    const response = await fetch(`/api/admin/homepage/faqs/${faqId}`, { method: "DELETE" });
    if (response.ok) setFaqs((current) => current.filter((faq) => faq.id !== faqId));
    setFeedback(response.ok ? "QA 已删除" : "删除失败");
  }

  return (
    <section className="admin-recruitment-qa">
      <div className="section-heading"><h3>招新提问与 QA</h3></div>
      {feedback ? <p className="message">{feedback}</p> : null}
      <div className="admin-recruitment-question-list">
        <h4>访客提问</h4>
        {questions.length ? questions.map((item) => (
          <article key={item.id}><strong>{item.author_name}</strong><p>{item.content}</p><time>{new Date(item.created_at).toLocaleString("zh-CN")}</time></article>
        )) : <p>暂时没有招新提问。</p>}
      </div>
      <form className="form" action="/api/admin/homepage/faqs" onSubmit={(event) => saveFaq(event)}>
        <h4>新增 QA</h4>
        <input name="question" placeholder="问题" maxLength={200} required />
        <textarea name="answer" placeholder="回答" rows={3} maxLength={1000} required />
        <input name="display_order" type="number" defaultValue={faqs.length + 1} min={0} />
        <label><input name="is_enabled" type="checkbox" value="true" defaultChecked /> 启用</label>
        <button className="button" type="submit">添加 QA</button>
      </form>
      <div className="admin-recruitment-faq-list">
        {faqs.map((faq) => (
          <form className="form" action={`/api/admin/homepage/faqs/${faq.id}`} key={faq.id} onSubmit={(event) => saveFaq(event, faq.id)}>
            <input name="question" defaultValue={faq.question} maxLength={200} required />
            <textarea name="answer" defaultValue={faq.answer} rows={3} maxLength={1000} required />
            <input name="display_order" type="number" defaultValue={faq.display_order} min={0} />
            <label><input name="is_enabled" type="checkbox" value="true" defaultChecked={faq.is_enabled} /> 启用</label>
            <div><button className="button" type="submit">保存</button><button className="text-button" type="button" onClick={() => deleteFaq(faq.id)}>删除</button></div>
          </form>
        ))}
      </div>
    </section>
  );
}
