"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmSetup, type FormState } from "@/actions/auth";
import { CodeField, Message } from "@/components/Form";

export function SetupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmSetup, undefined);
  if (state?.codes) {
    return (
      <div className="space-y-4">
        <Message state={state} />
        <div>
          <p className="label">Save your recovery codes</p>
          <p className="hint">If you lose your phone, each of these works once instead of a 6-digit code. Store them somewhere your kids can't reach — not on their devices.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-3 font-mono text-sm">
            {state.codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
        <Link href={next} className="btn-primary w-full py-3">I saved them — continue</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <CodeField label="3. Enter the 6-digit code it shows" />
      <Message state={state} />
      <button className="btn-primary w-full py-3" disabled={pending}>{pending ? "Checking…" : "Turn on two-step sign-in"}</button>
    </form>
  );
}
