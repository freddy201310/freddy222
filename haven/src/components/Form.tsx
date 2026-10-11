"use client";

import { useActionState } from "react";
import type { FormState } from "@/actions/auth";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export function Message({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="rounded-xl bg-danger-50 px-3.5 py-2 text-sm text-danger-700">{state.error}</p>;
  if (state?.ok) return <p role="status" className="rounded-xl bg-haven-50 px-3.5 py-2 text-sm text-haven-800">{state.ok}</p>;
  return null;
}

/** A form bound to a server action, with inline errors and a pending state. */
export function ActionForm({
  action,
  children,
  submit,
  pendingLabel = "Saving…",
  variant = "primary",
  className = "space-y-4",
}: {
  action: Action;
  children?: React.ReactNode;
  submit: string;
  pendingLabel?: string;
  variant?: "primary" | "danger" | "soft";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <Message state={state} />
      <button className={`btn-${variant}`} disabled={pending}>{pending ? pendingLabel : submit}</button>
    </form>
  );
}

/** The 6-digit code a parent enters to confirm a sensitive change. */
export function CodeField({ label = "Code from your authenticator app" }: { label?: string }) {
  return (
    <div>
      <label className="label" htmlFor="code">{label}</label>
      <input id="code" name="code" className="input max-w-[12rem] tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={11} required />
    </div>
  );
}
