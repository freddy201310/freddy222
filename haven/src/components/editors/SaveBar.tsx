"use client";

import type { FormState } from "@/actions/auth";
import { Message } from "../Form";

export function SaveBar({ state, pending, readOnly, onSave }: { state: FormState; pending: boolean; readOnly: boolean; onSave: () => void }) {
  if (readOnly) return <p className="hint">You have view-only access.</p>;
  return (
    <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white/95 p-3 shadow-soft">
      <button type="button" className="btn-primary" disabled={pending} onClick={onSave}>{pending ? "Saving…" : "Save changes"}</button>
      <Message state={state} />
    </div>
  );
}
