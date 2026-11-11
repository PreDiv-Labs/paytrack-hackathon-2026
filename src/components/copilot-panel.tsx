"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  Send,
  RotateCcw,
  LockKeyhole,
} from "lucide-react";
import type { CopilotAnswer } from "@/lib/copilot";
import type { HistoryTurn } from "@/lib/copilot-query";
const Charts = dynamic(() => import("./charts"), { ssr: false });
type Turn = { question: string; answer?: CopilotAnswer; error?: string };
export default function CopilotPanel({
  currency,
  month,
  preview,
  onEvidence,
}: {
  currency: string;
  month: string;
  preview: boolean;
  onEvidence: (ids: string[]) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const conversation = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const latest = turns.at(-1)?.answer;
  async function ask(text: string) {
    if (preview) {
      router.push("/login");
      return;
    }
    if (!text.trim() || inFlight.current) return;
    inFlight.current = true;
    const history: HistoryTurn[] = turns
      .filter((t) => t.answer)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        {
          role: "assistant" as const,
          content: [t.answer!.message, ...t.answer!.facts.slice(0, 3).map((f) => f.text)]
            .join("\n")
            .slice(0, 2000),
        },
      ])
      .slice(-12);
    setTurns((previous) => [...previous.slice(-11), { question: text }]);
    setQuestion("");
    setBusy(true);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, currency, month, history }),
      });
      if (response.status === 401) {
        router.push("/login");
        throw new Error("Your session expired. Please sign in again.");
      }
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Couldn't load your answer. Please try again.");
      setTurns((previous) =>
        previous.map((turn, i) =>
          i === previous.length - 1 ? { ...turn, answer: body as CopilotAnswer } : turn,
        ),
      );
    } catch (error) {
      setTurns((previous) =>
        previous.map((turn, i) =>
          i === previous.length - 1
            ? {
                ...turn,
                error: error instanceof Error ? error.message : "Connection failed. Please retry.",
              }
            : turn,
        ),
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
      requestAnimationFrame(() =>
        conversation.current?.scrollTo({
          top: conversation.current.scrollHeight,
          behavior: "smooth",
        }),
      );
    }
  }
  return (
    <div className="copilot-layout conversational-layout">
      <section className="panel copilot-main">
        <div className="copilot-top">
          <span className="answer-brand">
            <span className="icon-box purple">
              <Sparkles size={21} />
            </span>
            <strong>
              PayTrack Copilot<small>Ask. Explore. Follow the evidence.</small>
            </strong>
          </span>
          <button
            type="button"
            className="button small"
            disabled={busy || !turns.length}
            onClick={() => setTurns([])}
          >
            <RotateCcw size={14} />
            New chat
          </button>
        </div>
        <div
          className="copilot-conversation conversation-scroll"
          ref={conversation}
          aria-live="polite"
          aria-busy={busy}
        >
          {!turns.length && (
            <>
              <div className="copilot-welcome">
                <span className="copilot-star">
                  <Sparkles size={33} />
                </span>
                <h2>
                  Your questions.
                  <br />A clearer picture.
                </h2>
                <p>
                  Ask in your own words, then ask a follow-up. Explore payments, compare months,
                  review budgets, or get help using PayTrack.
                </p>
              </div>
              <div className="prompt-grid">
                {[
                  "What was my largest outgoing payment?",
                  "Compare this month with last month",
                  "How much budget do I have left?",
                  "How does splitting an expense work?",
                ].map((text) => (
                  <button key={text} onClick={() => ask(text)}>
                    <Sparkles size={16} />
                    <span>{text}</span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            </>
          )}
          {turns.map((turn, index) => (
            <div className="conversation-turn" key={index}>
              <div className="chat-question">{turn.question}</div>
              {turn.answer ? (
                <div className="copilot-answer">
                  <span className="answer-brand">
                    <Sparkles size={17} />
                    PAYTRACK
                    <small>
                      {turn.answer.source === "gemini"
                        ? "Gemini · verified calculations"
                        : "Calculated fallback"}
                    </small>
                  </span>
                  {turn.answer.issue && (
                    <div className="copilot-service-notice" role="status">
                      {turn.answer.issue}
                    </div>
                  )}
                  <p className="copilot-prose">{turn.answer.message}</p>
                  <span className="answer-scope">
                    {turn.answer.query.period === "all"
                      ? "All recorded history"
                      : turn.answer.query.month}{" "}
                    · {turn.answer.query.currency}
                  </span>
                  {turn.answer.facts.map((fact) => (
                    <article className="fact" key={fact.id}>
                      <p>{fact.text}</p>
                      {fact.evidence.length > 0 && (
                        <button className="evidence-link" onClick={() => onEvidence(fact.evidence)}>
                          <ShieldCheck size={13} />
                          {fact.evidence.length} source records
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </article>
                  ))}
                  {turn.answer.analytics.evidence.length > 0 &&
                    turn.answer.query.period === "month" &&
                    ["cashflow", "categories"].includes(turn.answer.view) && (
                      <Charts
                        analytics={turn.answer.analytics}
                        kind={turn.answer.view === "categories" ? "categories" : "cashflow"}
                      />
                    )}
                  <div className="answer-actions">
                    <Link
                      href={
                        turn.answer.view === "budgets"
                          ? "/budgets"
                          : turn.answer.query.intent === "help"
                            ? "/about"
                            : `/transactions?month=${turn.answer.query.month}&currency=${turn.answer.query.currency}`
                      }
                      className="text-link"
                    >
                      {turn.answer.view === "budgets"
                        ? "Manage budgets"
                        : turn.answer.query.intent === "help"
                          ? "About PayTrack"
                          : "Explore transactions"}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : turn.error ? (
                <div className="notice error" role="alert">
                  <p>{turn.error}</p>
                  <button className="text-link" disabled={busy} onClick={() => ask(turn.question)}>
                    Retry
                  </button>
                </div>
              ) : (
                <div className="thinking">
                  <LoaderCircle size={18} className="spin" />
                  Checking your records…
                </div>
              )}
            </div>
          ))}
        </div>
        {latest && !busy && (
          <div className="followup-prompts">
            {latest.suggestions.map((text) => (
              <button key={text} onClick={() => ask(text)}>
                {text}
                <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
        )}
        <form
          className="copilot-input"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <label className="sr-only" htmlFor="copilot-question">
            Ask PayTrack
          </label>
          <textarea
            id="copilot-question"
            rows={2}
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask anything about your PayTrack activity…"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask(question);
              }
            }}
          />
          <button
            className="button primary"
            aria-label="Send question"
            disabled={busy || !question.trim()}
          >
            <Send size={18} />
          </button>
        </form>
        <p className="copilot-disclaimer">
          <LockKeyhole size={12} />
          Read-only help. Payments and budget changes always need your approval.
        </p>
      </section>
      <aside className="copilot-context">
        <section className="panel copilot-guide">
          <span className="eyebrow">YOUR CONTEXT</span>
          <h3>
            {month} · {currency}
          </h3>
          <p>You can ask for another month or currency in your question.</p>
          <div className="divider" />
          <h3>A conversation, with sources.</h3>
          <p>
            Try “show those payments” or “what about last month?” Every amount is calculated from
            your authorized ledger. Open source records to inspect a payment.
          </p>
          <p>
            General guidance is separate from your personal financial results. Empty history won’t
            stop you asking how PayTrack works.
          </p>
          <Link className="text-link" href={preview ? "/preview/connection" : "/connection"}>
            Your connection
            <ArrowRight size={14} />
          </Link>
        </section>
        <p className="copilot-storage-note">
          Recent turns stay in this page. New chat clears them. Changing the reporting filters
          starts a fresh conversation. Gemini receives your questions and calculated context,
          without OAuth tokens, account email, or raw payment descriptions.
        </p>
      </aside>
    </div>
  );
}
