"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getSession, hashPassword, LOCKOUT_MS, MAX_FAILED_LOGINS, requireParent, verifyPassword } from "@/lib/auth";
import { seal, unseal, verifyTotp } from "@/lib/totp";
import { sha256 } from "@/lib/tokens";

export type FormState = { error?: string; ok?: string; codes?: string[]; code?: string; link?: string } | undefined;

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  if (await db.parent.findUnique({ where: { email } })) return { error: "An account with that email already exists." };
  const parent = await db.parent.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  await createSession(parent.id, false);
  const next = String(form.get("next") ?? "");
  redirect(`/setup-2fa${next.startsWith("/invite/") ? `?next=${encodeURIComponent(next)}` : ""}`);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const parent = await db.parent.findUnique({ where: { email } });
  const generic = { error: "That email and password don't match." };
  if (!parent) return generic;
  if (parent.lockedUntil && parent.lockedUntil > new Date()) return { error: "Too many attempts. Try again in a few minutes." };
  if (!(await verifyPassword(password, parent.passwordHash))) {
    await recordFailure(parent.id, parent.failedLogins);
    return generic;
  }
  await createSession(parent.id, false);
  const next = String(form.get("next") ?? "");
  const q = next.startsWith("/invite/") ? `?next=${encodeURIComponent(next)}` : "";
  redirect(parent.totpSecret ? `/login/verify${q}` : `/setup-2fa${q}`);
}

async function recordFailure(parentId: string, failed: number) {
  const count = failed + 1;
  await db.parent.update({
    where: { id: parentId },
    data: count >= MAX_FAILED_LOGINS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : { failedLogins: count },
  });
}

/** Check a 6-digit code, or spend a one-time recovery code. */
async function checkSecondFactor(parent: { id: string; totpSecret: string | null; recoveryCodes: string[] }, raw: string) {
  const code = raw.trim();
  if (parent.totpSecret && verifyTotp(unseal(parent.totpSecret), code)) return true;
  const hash = sha256(code.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  if (parent.recoveryCodes.includes(hash)) {
    await db.parent.update({ where: { id: parent.id }, data: { recoveryCodes: parent.recoveryCodes.filter((c) => c !== hash) } });
    return true;
  }
  return false;
}

export async function verifySecondStep(_: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const { parent } = session;
  if (parent.lockedUntil && parent.lockedUntil > new Date()) return { error: "Too many attempts. Try again in a few minutes." };
  if (!(await checkSecondFactor(parent, String(form.get("code") ?? "")))) {
    await recordFailure(parent.id, parent.failedLogins);
    return { error: "That code didn't work. Codes change every 30 seconds." };
  }
  await db.parent.update({ where: { id: parent.id }, data: { failedLogins: 0, lockedUntil: null } });
  await db.session.update({ where: { id: session.id }, data: { mfaPassed: true, reauthAt: new Date() } });
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/invite/") ? next : "/dashboard");
}

/** Called while rendering the setup page: makes sure there is a pending secret to show. */
export async function ensurePendingSecret(parentId: string, secret: string) {
  await db.parent.update({ where: { id: parentId }, data: { totpPending: seal(secret) } });
}

export async function confirmSetup(_: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const { parent } = session;
  if (parent.totpSecret && !session.mfaPassed) return { error: "Sign in with your existing code first." };
  if (!parent.totpPending) return { error: "Reload the page to get a new setup code." };
  const secret = unseal(parent.totpPending);
  if (!verifyTotp(secret, String(form.get("code") ?? ""))) return { error: "That code didn't match. Check your authenticator app and try again." };

  const codes = Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase());
  await db.parent.update({
    where: { id: parent.id },
    data: { totpSecret: seal(secret), totpPending: null, recoveryCodes: codes.map((c) => sha256(c)) },
  });
  // A new authenticator means every other session must sign in again.
  await db.session.deleteMany({ where: { parentId: parent.id, NOT: { id: session.id } } });
  await db.session.update({ where: { id: session.id }, data: { mfaPassed: true, reauthAt: new Date() } });
  return { ok: "Two-step sign-in is on.", codes: codes.map((c) => `${c.slice(0, 5)}-${c.slice(5)}`) };
}

/** Sensitive changes ask for a fresh code. Returns an error message, or null when confirmed. */
export async function confirmWithCode(form: FormData): Promise<string | null> {
  const { session, parent } = await requireParent();
  if (await checkSecondFactor(parent, String(form.get("code") ?? ""))) {
    await db.session.update({ where: { id: session.id }, data: { reauthAt: new Date() } });
    return null;
  }
  await recordFailure(parent.id, parent.failedLogins);
  return "Enter the current 6-digit code from your authenticator app to confirm.";
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const { session, parent } = await requireParent();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (!(await verifyPassword(current, parent.passwordHash))) return { error: "Your current password is wrong." };
  if (next.length < 10) return { error: "Use at least 10 characters." };
  const codeError = await confirmWithCode(form);
  if (codeError) return { error: codeError };
  await db.parent.update({ where: { id: parent.id }, data: { passwordHash: await hashPassword(next) } });
  await db.session.deleteMany({ where: { parentId: parent.id, NOT: { id: session.id } } });
  return { ok: "Password changed. Other devices were signed out." };
}

export async function signOutEverywhere() {
  const { parent } = await requireParent();
  await db.session.deleteMany({ where: { parentId: parent.id } });
  redirect("/login");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
