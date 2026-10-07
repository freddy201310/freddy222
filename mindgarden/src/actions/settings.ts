"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, SESSION_COOKIE, hashPassword, verifyPassword } from "@/lib/auth";

export type SettingsState = { ok?: string; error?: string } | undefined;

const ProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tone: z.enum(["warm", "direct", "playful", "calm"]),
  interests: z.array(z.string().max(60)).max(20),
  aiMemoryEnabled: z.boolean(),
});

export async function saveProfile(input: z.infer<typeof ProfileSchema>) {
  const user = await requireUser();
  const data = ProfileSchema.parse(input);
  await db.user.update({
    where: { id: user.id },
    data: { name: data.name, companionTone: data.tone, interests: data.interests, aiMemoryEnabled: data.aiMemoryEnabled },
  });
  revalidatePath("/", "layout");
}

export async function changePassword(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "New password needs at least 8 characters." };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Password updated." };
}

export async function clearMemory(what: "manual" | "conversations" | "journal" | "moods") {
  const user = await requireUser();
  const where = { userId: user.id };
  if (what === "manual") await db.manualEntry.deleteMany({ where });
  if (what === "conversations") await db.conversation.deleteMany({ where });
  if (what === "journal") await db.journalEntry.deleteMany({ where });
  if (what === "moods") await db.moodLog.deleteMany({ where });
  revalidatePath("/", "layout");
}

export async function deleteAccount(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (String(form.get("confirm")) !== "DELETE") return { error: 'Type DELETE to confirm.' };
  // Cascading relations remove every piece of user data along with the account.
  await db.user.delete({ where: { id: user.id } });
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/?deleted=1");
}
