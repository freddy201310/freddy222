"use client";

import { useActionState, useEffect, useState } from "react";
import { createInvite } from "@/actions/family";
import type { FormState } from "@/actions/auth";
import { Message } from "./Form";

type State = FormState;

export function InviteForm() {
  const [state, action, pending] = useActionState<State, FormData>(createInvite, undefined);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input name="email" type="email" className="input" placeholder="their@email.com" required aria-label="Email" />
        <select name="role" className="input" aria-label="Role">
          <option value="CO_PARENT">Co-parent (full control)</option>
          <option value="VIEWER">View only</option>
        </select>
        <button className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create invite"}</button>
      </div>
      <Message state={state} />
      {state?.link && <input readOnly className="input font-mono text-sm" value={`${origin}${state.link}`} onFocus={(e) => e.target.select()} aria-label="Invite link" />}
    </form>
  );
}
