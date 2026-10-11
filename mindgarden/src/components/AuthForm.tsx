"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? login : signup, undefined);
  return (
    <form action={action} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">What should we call you?</label>
          <input id="name" name="name" className="input" autoComplete="given-name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
      </div>
      {state?.error && <p role="alert" className="rounded-2xl bg-dawn-50 px-4 py-2 text-sm text-bark-700">{state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={pending}>
        {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create my garden"}
      </button>
      <p className="text-center text-sm text-moss-600">
        {mode === "login" ? (
          <>New here? <Link href="/signup" className="font-medium underline underline-offset-4">Create an account</Link></>
        ) : (
          <>Already growing? <Link href="/login" className="font-medium underline underline-offset-4">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
