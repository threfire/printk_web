"use client";

import { useState, type FormEvent } from "react";
import type { RecruitmentFaq } from "@/lib/api";
import { HomeReveal } from "@/components/HomeReveal";

export function RecruitmentQuestions({ accountName, faqs }: { accountName: string; faqs: RecruitmentFaq[] }) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  function fitQuestionHeight(element: HTMLTextAreaElement) {
    element.style.height = "0";
    element.style.height = `${element.scrollHeight}px`;
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    const form = event.currentTarget;
    const content = String(new FormData(form).get("content") ?? "");
    const response = await fetch("/api/homepage/recruitment-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setFeedback(String(body.detail ?? "提交失败"));
      return;
    }
    form.reset();
    const textarea = form.elements.namedItem("content");
    if (textarea instanceof HTMLTextAreaElement) fitQuestionHeight(textarea);
    setFeedback("问题已提交，管理员会在后台查看");
  }

  return (
    <>
      <HomeReveal className="home-recruitment-question" aria-labelledby="recruitment-question-title">
        <h2 id="recruitment-question-title">还有招新疑问？</h2>
        {accountName ? (
          <form onSubmit={submitQuestion}>
            <textarea name="content" maxLength={500} rows={1} placeholder="写下你想了解的问题" onInput={(event) => fitQuestionHeight(event.currentTarget)} required />
            <button className="home-question-submit" type="submit" disabled={busy}>{busy ? "提交中…" : "提交"}</button>
          </form>
        ) : <p>登录账号后即可向战队提交招新问题。</p>}
        {feedback ? <p role="status">{feedback}</p> : null}
      </HomeReveal>

      <HomeReveal className="home-recruitment-faq" aria-labelledby="recruitment-faq-title">
        <h2 id="recruitment-faq-title">QA：</h2>
        <div>
          {faqs.map((faq) => (
            <article key={faq.id}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </HomeReveal>
    </>
  );
}
