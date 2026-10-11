"use client";

import { ArrowRight, CircleHelp, Send, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeading } from "@/components/ui/page-heading";

const starterPrompts = [
  "Help me compare direct entry and a foundation year",
  "What should I prepare before shortlisting universities?",
  "How can I plan applications across different countries?",
];

export function AdvisorWorkspace() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ question: string; text: string } | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    if (requestState === "loading") return;
    setRequestState("loading");
    setError("");
    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const body = await response.json() as { data?: { answer?: string }; error?: { message?: string } };
      if (!response.ok || !body.data?.answer) throw new Error(body.error?.message ?? "The advisor could not respond.");
      setAnswer({ question: trimmedQuestion, text: body.data.answer });
      setQuestion("");
      setRequestState("idle");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The advisor could not respond. Try again.");
      setRequestState("error");
    }
  }

  return (
    <div className="workspace-page advisor-workspace">
      <PageHeading
        eyebrow="ADMISSIONS GUIDANCE"
        title="AI Advisor"
        description="Organize questions and explore the decisions behind your international study plan."
        badge="PREVIEW · NOT CONNECTED"
      />

      <div className="advisor-layout">
        <section className="advisor-main section-card">
          <div className="advisor-intro">
            <span className="advisor-mark"><Sparkles size={18} aria-hidden="true" /></span>
            <div>
              <span className="panel-eyebrow">YOUR PLANNING SPACE</span>
              <h2>Start with the question in front of you</h2>
              <p>Ask about education and admissions using the evidence available in your AdmitOS workspace.</p>
            </div>
          </div>

          {answer && (
            <div className="advisor-preview-state" role="status">
              <span className="preview-state-label">ADMITOS ANSWER</span>
              <strong>{answer.question}</strong>
              <p>{answer.text}</p>
            </div>
          )}
          {error && <div className="advisor-preview-state" role="alert"><strong>Advisor unavailable</strong><p>{error}</p></div>}

          <form className="advisor-composer" onSubmit={handleSubmit}>
            <label htmlFor="advisor-question">Your question</label>
            <textarea
              id="advisor-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="For example: What should I compare before choosing a study destination?"
              rows={4}
            />
            <div className="composer-footer">
              <span><CircleHelp size={13} aria-hidden="true" /> Answers use authorized AdmitOS evidence</span>
              <button className="primary-button" type="submit" disabled={!question.trim() || requestState === "loading"}>
                {requestState === "loading" ? "Checking evidence…" : "Ask advisor"} <Send size={14} aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="prompt-library">
            <div className="prompt-library-heading">
              <strong>Good questions to explore</strong>
              <span>Choose one to edit</span>
            </div>
            <div className="prompt-list">
              {starterPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>
                  {prompt}<ArrowRight size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="advisor-context">
          <span className="panel-eyebrow">A USEFUL START</span>
          <h2>Context makes guidance more useful</h2>
          <p>Keep your goals, constraints, and source material together before comparing options.</p>
          <div className="advisor-context-items">
            <div><span>01</span><strong>Study goals</strong><small>Subjects and degree level</small></div>
            <div><span>02</span><strong>Practical constraints</strong><small>Budget, location, and timing</small></div>
            <div><span>03</span><strong>Evidence to verify</strong><small>Requirements and official sources</small></div>
          </div>
          <p className="advisor-disclaimer">Planning prompts are not admissions, immigration, or financial advice.</p>
        </aside>
      </div>
    </div>
  );
}