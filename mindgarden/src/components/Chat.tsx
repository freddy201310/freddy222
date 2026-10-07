"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatEvent } from "@/app/api/chat/route";
import { RichText } from "./RichText";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; rating: Rating | null };
type Rating = "HELPFUL" | "NOT_HELPFUL" | "LOVED_IT" | "DOESNT_FIT";

const RATINGS: { id: Rating; label: string; icon: string }[] = [
  { id: "LOVED_IT", label: "Loved it", icon: "💚" },
  { id: "HELPFUL", label: "Helpful", icon: "👍" },
  { id: "NOT_HELPFUL", label: "Not helpful", icon: "🤔" },
  { id: "DOESNT_FIT", label: "Doesn't fit me", icon: "🙅" },
];

export function Chat({
  conversationId: initialId,
  initialMessages,
  mode = "companion",
  starters = [],
  placeholder = "What's on your mind?",
  autoSend,
  persona = { name: "Companion", icon: "🌿" },
}: {
  conversationId?: string;
  initialMessages: ChatMessage[];
  mode?: "companion" | "future-me";
  starters?: string[];
  placeholder?: string;
  autoSend?: string;
  persona?: { name: string; icon: string };
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialId);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [support, setSupport] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput("");
    const tempUser = `u-${Date.now()}`;
    const tempBot = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: tempUser, role: "user", content: message, rating: null }, { id: tempBot, role: "assistant", content: "", rating: null }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message, mode }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let newId: string | undefined;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const ev = JSON.parse(line) as ChatEvent;
          if (ev.type === "meta") {
            if (!conversationId) newId = ev.conversationId;
            setConversationId(ev.conversationId);
            if (ev.support) setSupport(true);
            setMessages((m) => m.map((x) => (x.id === tempUser ? { ...x, id: ev.userMessageId } : x)));
          } else if (ev.type === "delta") {
            setMessages((m) => m.map((x) => (x.id === tempBot ? { ...x, content: x.content + ev.text } : x)));
          } else if (ev.type === "done") {
            setMessages((m) => m.map((x) => (x.id === tempBot ? { ...x, id: ev.messageId } : x)));
          }
        }
      }
      if (newId && mode === "companion") router.replace(`/companion/${newId}`, { scroll: false });
      router.refresh();
    } catch {
      setMessages((m) => m.map((x) => (x.id === tempBot ? { ...x, content: "Something interrupted us. Please try again in a moment." } : x)));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoSend && !autoSent.current && messages.length === 0) {
      autoSent.current = true;
      void send(autoSend);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  async function rate(id: string, rating: Rating) {
    const current = messages.find((m) => m.id === id)?.rating;
    const next = current === rating ? null : rating;
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, rating: next } : x)));
    await fetch(`/api/messages/${id}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: next }) });
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      {support && (
        <div role="alert" className="mb-4 rounded-2xl border border-dawn-200 bg-dawn-50 p-4 text-sm text-bark-700">
          <strong>You don&apos;t have to carry this alone.</strong> MindGarden isn&apos;t a crisis service. If you might be in danger, please contact local emergency services. In the US, call or text <strong>988</strong>; elsewhere, visit <a className="underline" href="https://findahelpline.com" target="_blank" rel="noreferrer">findahelpline.com</a>.
        </div>
      )}

      <div className="flex-1 space-y-5">
        {messages.length === 0 && starters.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {starters.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-2xl border border-moss-100 bg-white/80 p-4 text-left text-moss-800 transition hover:border-moss-300 hover:bg-white">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-moss-600 px-5 py-3 text-white">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-100 text-lg" aria-hidden>{persona.icon}</div>
              <div className="max-w-[85%]">
                <div className="rounded-3xl rounded-tl-md border border-moss-100 bg-white px-5 py-3 text-moss-900 shadow-sm">
                  {m.content ? <RichText text={m.content} /> : <Typing />}
                </div>
                {m.content && !m.id.startsWith("a-") && (
                  <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Rate this reply">
                    {RATINGS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => rate(m.id, r.id)}
                        aria-pressed={m.rating === r.id}
                        className={`rounded-full px-2.5 py-0.5 text-xs transition ${m.rating === r.id ? "bg-moss-600 text-white" : "text-moss-500 hover:bg-moss-100"}`}
                      >
                        {r.icon} {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
        className="sticky bottom-16 mt-6 flex items-end gap-2 rounded-3xl border border-moss-200 bg-white p-2 shadow-soft lg:bottom-4"
      >
        <label htmlFor="chat-input" className="sr-only">Message {persona.name}</label>
        <textarea
          id="chat-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
          }}
          placeholder={placeholder}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 focus:outline-none"
        />
        <button className="btn-primary" disabled={busy || !input.trim()}>{busy ? "…" : "Send"}</button>
      </form>
    </div>
  );
}

function Typing() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-moss-300" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}
