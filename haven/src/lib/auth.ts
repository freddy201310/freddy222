import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { newToken, sha256 } from "./tokens";

export const SESSION_COOKIE = "hv_session";
const SESSION_DAYS = 14;
const REAUTH_WINDOW_MS = 10 * 60_000;
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60_000;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function createSession(parentId: string, mfaPassed: boolean) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 200);
  await db.session.create({ data: { id: sha256(token), parentId, mfaPassed, expiresAt, userAgent } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: sha256(token) }, include: { parent: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

/** A fully signed-in parent: password and two-step code both passed. */
export async function requireParent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.parent.totpSecret) redirect("/setup-2fa");
  if (!session.mfaPassed) redirect("/login/verify");
  return { session, parent: session.parent };
}

/** Sensitive changes (removing a device, a child, or a parent) need a fresh code from the parent's phone. */
export const hasRecentReauth = (session: { reauthAt: Date | null }) =>
  session.reauthAt !== null && Date.now() - session.reauthAt.getTime() < REAUTH_WINDOW_MS;

export type SignedInParent = Awaited<ReturnType<typeof requireParent>>;
