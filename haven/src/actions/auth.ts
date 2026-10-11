"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getSession, hashPassword, LOCKOUT_MS, MAX_FAILED_LOGINS, requireParent, verifyPassword } from "@/lib/auth";
import { seal, unseal, verifyTotp } from "@/lib/totp";
import { newToken, sha256 } from "@/lib/tokens";
import { rateLimit, requestIp } from "@/lib/ratelimit";
import { appUrl, sendEmail } from "@/lib/email";
import { isE164 } from "@/lib/sms";

export type FormState = { error?: string; ok?: string; codes?: string[]; code?: string; link?: string } | undefined;

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit(`signup:${await requestIp()}`, 10, 60 * 60))) return { error: "Too many sign-ups from this network. Try again later." };
  const parsed = SignupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("terms") !== "on") return { error: "Please confirm you're a parent or guardian and agree to the terms." };
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
  const ip = await requestIp();
  if (!(await rateLimit(`login:ip:${ip}`, 30, 15 * 60)) || !(await rateLimit(`login:email:${email}`, 10, 15 * 60))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }
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
  if (!(await rateLimit(`mfa:${parent.id}`, 10, 15 * 60))) return { error: "Too many attempts. Try again in a few minutes." };
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

const RESET_MINUTES = 30;

/** Always gives the same answer, so this form can't be used to find out who has an account. */
export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const done = { ok: "If that email has a Haven account, a reset link is on its way. It works for 30 minutes." };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email." };
  const ip = await requestIp();
  if (!(await rateLimit(`forgot:ip:${ip}`, 10, 60 * 60)) || !(await rateLimit(`forgot:email:${email}`, 3, 60 * 60))) return done;
  const parent = await db.parent.findUnique({ where: { email } });
  if (!parent) return done;
  const token = newToken();
  await db.passwordReset.create({ data: { parentId: parent.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } });
  await sendEmail({
    to: parent.email,
    subject: "Reset your Haven password",
    text: `Someone asked to reset the password for your Haven account.\n\nReset it here (works once, for ${RESET_MINUTES} minutes):\n${appUrl()}/reset/${token}\n\nYou'll still need the code from your authenticator app to sign in. If this wasn't you, ignore this email — your password hasn't changed.`,
  });
  return done;
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return { error: "This reset link has expired. Ask for a new one." };
  const claimed = await db.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return { error: "This reset link has already been used." };
  await db.parent.update({ where: { id: reset.parentId }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } });
  // Anyone signed in with the old password is signed out.
  await db.session.deleteMany({ where: { parentId: reset.parentId } });
  const parent = await db.parent.findUniqueOrThrow({ where: { id: reset.parentId } });
  await sendEmail({ to: parent.email, subject: "Your Haven password was changed", text: "Your Haven password was just reset, and every device was signed out. If this wasn't you, reset it again right away." });
  redirect("/login?reset=1");
}

const NotifySchema = z.object({
  notifyEmail: z.literal("on").optional(),
  notifySms: z.literal("on").optional(),
  notifyLevel: z.enum(["INFO", "WARNING", "CRITICAL"]),
  phone: z.string().trim().max(20).optional(),
});

export async function saveNotifications(_: FormState, form: FormData): Promise<FormState> {
  const { parent } = await requireParent();
  const parsed = NotifySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the form and try again." };
  const phone = (parsed.data.phone ?? "").replace(/[\s()-]/g, "");
  if (parsed.data.notifySms && !isE164(phone)) return { error: "Enter your mobile number with country code, like +15551234567." };
  await db.parent.update({
    where: { id: parent.id },
    data: { notifyEmail: Boolean(parsed.data.notifyEmail), notifySms: Boolean(parsed.data.notifySms), notifyLevel: parsed.data.notifyLevel, phone: phone || null },
  });
  return { ok: "Saved." };
}

/** Delete this parent's account. An owner's account takes the whole family with it. */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const { parent } = await requireParent();
  if (String(form.get("confirm") ?? "") !== "DELETE") return { error: "Type DELETE to confirm." };
  const codeError = await confirmWithCode(form);
  if (codeError) return { error: codeError };
  const owned = await db.familyMember.findMany({ where: { parentId: parent.id, role: "OWNER" } });
  await db.family.deleteMany({ where: { id: { in: owned.map((m) => m.familyId) } } });
  await db.parent.delete({ where: { id: parent.id } });
  await destroySession();
  redirect("/?deleted=1");
}
