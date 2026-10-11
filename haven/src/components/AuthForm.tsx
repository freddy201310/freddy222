"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/actions/auth";
import { Message } from "./Form";

export function AuthForm({ mode, next = "" }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? login : signup, undefined);
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" className="input" autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" minLength={mode === "signup" ? 10 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
        {mode === "signup" && <p className="hint mt-1.5">At least 10 characters. Don't reuse your phone passcode — kids often know it.</p>}
      </div>
      <Message state={state} />
      <button className="btn-primary w-full py-3" disabled={pending}>
        {pending ? "One moment…" : mode === "login" ? "Continue" : "Create parent account"}
      </button>
      <p className="text-center text-sm text-ink-500">
        {mode === "login" ? (
          <>New to Haven? <Link href={`/signup${q}`} className="font-semibold text-haven-700 underline underline-offset-4">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href={`/login${q}`} className="font-semibold text-haven-700 underline underline-offset-4">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
