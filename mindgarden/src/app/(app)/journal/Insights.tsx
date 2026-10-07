"use client";

import { useState, useTransition } from "react";
import { generateJournalInsights, type JournalInsight } from "@/actions/journal";
import { RichText } from "@/components/RichText";

export function Insights() {
  const [result, setResult] = useState<JournalInsight | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="card bg-gradient-to-br from-white to-dawn-50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Patterns in your writing</h2>
          <p className="text-sm text-moss-600">Your companion reads your recent entries and reflects back what it notices.</p>
        </div>
        <button className="btn-primary" disabled={pending} onClick={() => start(async () => setResult(await generateJournalInsights()))}>
          {pending ? "Reading closely…" : result ? "Refresh insights" : "Find patterns"}
        </button>
      </div>
      {result && "error" in result && <p className="mt-4 text-sm text-moss-600">{result.error}</p>}
      {result && "reflection" in result && (
        <div className="mt-5 space-y-4">
          <div className="text-moss-900"><RichText text={result.reflection} /></div>
          {result.themes.length > 0 && (
            <div className="flex flex-wrap gap-2">{result.themes.map((t) => <span key={t} className="chip">{t}</span>)}</div>
          )}
          {result.added > 0 && <p className="text-sm text-moss-500">📖 Added {result.added} {result.added === 1 ? "insight" : "insights"} to your Life Manual.</p>}
        </div>
      )}
    </section>
  );
}
