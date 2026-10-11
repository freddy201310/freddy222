"use client";

import { useState, useTransition } from "react";
import { deleteManualEntry, updateManualEntry } from "@/actions/manual";

const SOURCE_LABEL: Record<string, string> = { companion: "learned in conversation", journal: "from your journal", reset: "from a reset", checkin: "from a check-in" };

export function ManualEntryItem({ id, content, source, strength }: { id: string; content: string; source: string; strength: number }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <li className="flex gap-2">
        <input className="input py-1.5 text-sm" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <button className="btn-soft px-3 py-1.5 text-xs" disabled={pending} onClick={() => start(async () => { await updateManualEntry(id, text); setEditing(false); })}>Save</button>
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { setText(content); setEditing(false); }}>Cancel</button>
      </li>
    );
  }
  return (
    <li className={`group flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-moss-50 ${pending ? "opacity-50" : ""}`}>
      <span className="flex-1 text-moss-900">
        {content}
        {(source !== "user" || strength > 1) && (
          <span className="ml-2 text-xs text-moss-400">
            {SOURCE_LABEL[source] ?? ""}{source !== "user" && strength > 1 ? " · " : ""}{strength > 1 ? `noticed ${strength}×` : ""}
          </span>
        )}
      </span>
      <span className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button className="text-xs text-moss-500 hover:text-moss-800" onClick={() => setEditing(true)}>Edit</button>
        <button className="text-xs text-moss-500 hover:text-bark-700" onClick={() => start(() => deleteManualEntry(id))} aria-label={`Remove ${content}`}>Remove</button>
      </span>
    </li>
  );
}
