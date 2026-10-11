import "server-only";
import { redirect } from "next/navigation";
import type { FamilyRole, Severity } from "@prisma/client";
import { db } from "./db";
import { requireParent } from "./auth";
import { ageOf, parseRules } from "./rules";
import { notifyParents } from "./notify";

/** The signed-in parent and their family. Every page and action goes through this. */
export async function requireFamily() {
  const ctx = await requireParent();
  const membership = await db.familyMember.findFirst({ where: { parentId: ctx.parent.id }, include: { family: true }, orderBy: { createdAt: "asc" } });
  if (!membership) redirect("/onboarding");
  return { ...ctx, family: membership.family, role: membership.role };
}

export const canEdit = (role: FamilyRole) => role === "OWNER" || role === "CO_PARENT";

export async function requireEditor() {
  const ctx = await requireFamily();
  if (!canEdit(ctx.role)) throw new Error("Your role in this family is view-only.");
  return ctx;
}

/** Load a child only if it belongs to the parent's family. */
export async function loadChild(familyId: string, childId: string) {
  const child = await db.child.findFirst({ where: { id: childId, familyId }, include: { policy: true } });
  if (!child) redirect("/dashboard");
  return { ...child, rules: parseRules(child.policy?.rules, ageOf(child.birthYear)) };
}

export async function audit(familyId: string, parentId: string | null, action: string, detail = "") {
  await db.auditLog.create({ data: { familyId, parentId, action, detail: detail.slice(0, 500) } });
}

export async function raiseAlert(data: { familyId: string; childId?: string; deviceId?: string; kind: string; severity: Severity; message: string }) {
  const alert = await db.alert.create({ data });
  // A failed email or text must never break the phone's check-in.
  await notifyParents(alert).catch((e) => console.error("[notify]", e));
  return alert;
}
