"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { JournalMode } from "@prisma/client";
import { saveJournalEntry } from "@/actions/journal";
import { JOURNAL_MODES } from "@/lib/journal";

export function JournalEditor({ initialMode, initialPrompt, compact = false }: { initialMode: JournalMode; initialPrompt?: string; compact?: boolean }) {
  const [mode, setMode] = useState<JournalMode>(initialMode);
  const cfg = JOURNAL_MODES.find((m) => m.id === mode)!;
  const [prompt, setPrompt] = useState(initialPrompt ?? cfg.prompts[0]);

  return (
    <form action={saveJournalEntry} className="space-y-5">
      {!compact && (
        <div className="flex flex-wrap gap-2">
          {JOURNAL_MODES.map((m) => (
            <button
              type="button"
              key={m.id}
              aria-pressed={mode === m.id}
              onClick={() => { setMode(m.id); setPrompt(m.prompts[0]); }}
              className={`chip ${mode === m.id ? "chip-on" : ""}`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="prompt" value={mode === "BRAIN_DUMP" && !initialPrompt ? "" : prompt} />

      <div className={compact ? "" : "card"}>
        {!compact && <p className="text-sm text-moss-500">{cfg.desc}</p>}
        {mode !== "BRAIN_DUMP" || initialPrompt ? (
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="font-serif text-xl text-moss-800">{prompt}</p>
            {cfg.prompts.length > 1 && !initialPrompt && (
              <button
                type="button"
                className="shrink-0 text-xs text-moss-500 underline underline-offset-4"
                onClick={() => setPrompt(cfg.prompts[(cfg.prompts.indexOf(prompt) + 1) % cfg.prompts.length])}
              >
                Another prompt
              </button>
            )}
          </div>
        ) : null}
        {!compact && <input name="title" className="input mt-4 border-transparent bg-moss-50/60 font-serif text-lg" placeholder="Title (optional)" maxLength={120} />}
        <textarea
          name="content"
          required
          className="input mt-3 min-h-[40vh] resize-y border-transparent bg-moss-50/60 leading-relaxed"
          placeholder={mode === "BRAIN_DUMP" ? "Just start typing. Nothing here has to make sense." : "Write freely…"}
          autoFocus
        />
      </div>
      <SaveButton />
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save entry"}</button>;
}
