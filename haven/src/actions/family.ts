"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FamilyRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { audit, requireFamily } from "@/lib/family";
import { newToken, sha256 } from "@/lib/tokens";
import { confirmWithCode, type FormState } from "./auth";

const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const FamilySchema = z.object({
  name: z.string().trim().min(1, "Name your family").max(60),
  timeZone: z.string().refine(validZone, "Pick a time zone"),
});

export async function createFamily(_: FormState, form: FormData): Promise<FormState> {
  const { parent } = await requireParent();
  if (await db.familyMember.findFirst({ where: { parentId: parent.id } })) redirect("/dashboard");
  const parsed = FamilySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const family = await db.family.create({ data: { ...parsed.data, members: { create: { parentId: parent.id, role: "OWNER" } } } });
  await audit(family.id, parent.id, "family.created", family.name);
  redirect("/children/new");
}

export async function updateFamily(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent, role } = await requireFamily();
  if (role !== "OWNER") return { error: "Only the family owner can change this." };
  const parsed = FamilySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.family.update({ where: { id: family.id }, data: parsed.data });
  await audit(family.id, parent.id, "family.updated", `${parsed.data.name}, ${parsed.data.timeZone}`);
  revalidatePath("/family");
  return { ok: "Saved." };
}

const roles = ["CO_PARENT", "VIEWER"] as const;

export async function createInvite(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent, role } = await requireFamily();
  if (role !== "OWNER") return { error: "Only the family owner can invite parents." };
  const parsed = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), role: z.enum(roles) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const token = newToken();
  await db.invite.create({ data: { familyId: family.id, email: parsed.data.email, role: parsed.data.role, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
  await audit(family.id, parent.id, "invite.created", `${parsed.data.email} as ${parsed.data.role}`);
  revalidatePath("/family");
  return { ok: "Invite created. Send this link to them; it works once, for 7 days, and only for that email.", link: `/invite/${token}` };
}

export async function revokeInvite(inviteId: string) {
  const { family, parent, role } = await requireFamily();
  if (role !== "OWNER") return;
  const invite = await db.invite.findFirst({ where: { id: inviteId, familyId: family.id } });
  if (!invite) return;
  await db.invite.delete({ where: { id: invite.id } });
  await audit(family.id, parent.id, "invite.revoked", invite.email);
  revalidatePath("/family");
}

export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const { parent } = await requireParent();
  const token = String(form.get("token") ?? "");
  const invite = await db.invite.findUnique({ where: { tokenHash: sha256(token) }, include: { family: true } });
  if (!invite || invite.expiresAt < new Date()) return { error: "This invite has expired. Ask for a new one." };
  if (invite.email !== parent.email) return { error: `This invite is for ${invite.email}. Sign in with that email to accept it.` };
  if (await db.familyMember.findFirst({ where: { parentId: parent.id } })) return { error: "You already belong to a family on Haven." };
  await db.$transaction([
    db.familyMember.create({ data: { parentId: parent.id, familyId: invite.familyId, role: invite.role } }),
    db.invite.delete({ where: { id: invite.id } }),
  ]);
  await audit(invite.familyId, parent.id, "invite.accepted", `${parent.email} joined as ${invite.role}`);
  redirect("/dashboard");
}

export async function changeRole(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent, role } = await requireFamily();
  if (role !== "OWNER") return { error: "Only the family owner can change roles." };
  const memberId = String(form.get("memberId"));
  const next = String(form.get("role")) as FamilyRole;
  if (!roles.includes(next as (typeof roles)[number]) || memberId === parent.id) return { error: "That change isn't allowed." };
  const codeError = await confirmWithCode(form);
  if (codeError) return { error: codeError };
  await db.familyMember.update({ where: { parentId_familyId: { parentId: memberId, familyId: family.id } }, data: { role: next } });
  await audit(family.id, parent.id, "member.role_changed", `${memberId} → ${next}`);
  revalidatePath("/family");
  return { ok: "Role updated." };
}

export async function removeMember(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent, role } = await requireFamily();
  const memberId = String(form.get("memberId"));
  // Owners can remove anyone else; anyone can leave on their own.
  if (memberId === parent.id ? role === "OWNER" : role !== "OWNER") return { error: "That change isn't allowed." };
  const codeError = await confirmWithCode(form);
  if (codeError) return { error: codeError };
  const member = await db.familyMember.findUnique({ where: { parentId_familyId: { parentId: memberId, familyId: family.id } }, include: { parent: true } });
  if (!member) return { error: "Not found." };
  await db.familyMember.delete({ where: { parentId_familyId: { parentId: memberId, familyId: family.id } } });
  await db.session.deleteMany({ where: { parentId: memberId } });
  await audit(family.id, parent.id, "member.removed", member.parent.email);
  if (memberId === parent.id) redirect("/onboarding");
  revalidatePath("/family");
  return { ok: "Removed." };
}
