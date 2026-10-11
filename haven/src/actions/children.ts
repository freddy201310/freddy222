"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Platform, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, loadChild, requireEditor, requireFamily } from "@/lib/family";
import { localParts } from "@/lib/time";
import { defaultRules, RulesSchema, type Rules } from "@/lib/rules";
import { newEnrollmentCode, sha256 } from "@/lib/tokens";
import { confirmWithCode, type FormState } from "./auth";

const COLORS = ["indigo", "rose", "amber", "emerald", "sky", "violet"] as const;

export async function addChild(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent } = await requireEditor();
  const year = new Date().getUTCFullYear();
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Enter a name").max(40),
      birthYear: z.coerce.number().int().min(year - 18, "Haven is for children under 18").max(year, "Check the birth year"),
      color: z.enum(COLORS).default("indigo"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const child = await db.child.create({
    data: { familyId: family.id, ...parsed.data, policy: { create: { rules: defaultRules(year - parsed.data.birthYear), updatedById: parent.id } } },
  });
  await audit(family.id, parent.id, "child.added", child.name);
  redirect(`/children/${child.id}`);
}

export async function removeChild(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent } = await requireEditor();
  const child = await loadChild(family.id, String(form.get("childId")));
  const codeError = await confirmWithCode(form);
  if (codeError) return { error: codeError };
  await db.child.delete({ where: { id: child.id } });
  await audit(family.id, parent.id, "child.removed", child.name);
  redirect("/dashboard");
}

const SECTIONS = ["paused", "dailyLimit", "schedules", "categories", "apps", "alwaysAllowed", "installs", "web", "requests", "communication", "tamper"] as const;
type Section = (typeof SECTIONS)[number];

/** Save one or more sections of a child's rules. Every change bumps the version phones must confirm. */
export async function saveRules(childId: string, patch: Partial<Rules>): Promise<FormState> {
  const { family, parent } = await requireEditor();
  const child = await loadChild(family.id, childId);
  const keys = Object.keys(patch).filter((k): k is Section => (SECTIONS as readonly string[]).includes(k));
  const merged = RulesSchema.safeParse({ ...child.rules, ...Object.fromEntries(keys.map((k) => [k, patch[k]])) });
  if (!merged.success) {
    const issue = merged.error.issues[0];
    return { error: `${issue.path.join(" › ")}: ${issue.message}` };
  }
  await db.policy.upsert({
    where: { childId: child.id },
    create: { childId: child.id, rules: merged.data as Prisma.InputJsonValue, updatedById: parent.id },
    update: { rules: merged.data as Prisma.InputJsonValue, version: { increment: 1 }, updatedById: parent.id },
  });
  await audit(family.id, parent.id, "rules.updated", `${child.name}: ${keys.join(", ")}`);
  revalidatePath(`/children/${child.id}`, "layout");
  return { ok: "Saved. Phones pick this up within a minute." };
}

export async function setPaused(childId: string, paused: boolean) {
  await saveRules(childId, { paused });
}

export async function createEnrollment(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent } = await requireEditor();
  const child = await loadChild(family.id, String(form.get("childId")));
  const platform = String(form.get("platform")) as Platform;
  if (platform !== "IOS" && platform !== "ANDROID") return { error: "Pick iPhone or Samsung/Android." };
  const code = newEnrollmentCode();
  await db.enrollmentCode.create({ data: { childId: child.id, platform, codeHash: sha256(code), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  await audit(family.id, parent.id, "device.code_created", `${child.name} (${platform})`);
  return { code, ok: "Code expires in 30 minutes and works once." };
}

export async function renameDevice(deviceId: string, form: FormData) {
  const { family, parent } = await requireEditor();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const device = await db.device.findFirst({ where: { id: deviceId, child: { familyId: family.id } } });
  if (!device || !name) return;
  await db.device.update({ where: { id: device.id }, data: { name } });
  await audit(family.id, parent.id, "device.renamed", `${device.name} → ${name}`);
  revalidatePath(`/children/${device.childId}`);
}

export async function revokeDevice(_: FormState, form: FormData): Promise<FormState> {
  const { family, parent } = await requireEditor();
  const device = await db.device.findFirst({ where: { id: String(form.get("deviceId")), child: { familyId: family.id } } });
  if (!device) return { error: "Not found." };
  const codeError = await confirmWithCode(form);
  if (codeError) return { error: codeError };
  await db.device.update({ where: { id: device.id }, data: { revokedAt: new Date() } });
  await audit(family.id, parent.id, "device.removed", device.name);
  revalidatePath(`/children/${device.childId}`);
  return { ok: `${device.name} was removed. Its Haven app can now be uninstalled.` };
}

export async function decideRequest(requestId: string, form: FormData) {
  const { family, parent } = await requireEditor();
  const request = await db.timeRequest.findFirst({ where: { id: requestId, child: { familyId: family.id }, status: "PENDING" }, include: { child: true } });
  if (!request) return;
  const approve = form.get("decision") === "approve";
  const minutes = Math.max(1, Math.min(240, Number(form.get("minutes")) || request.minutes));
  await db.timeRequest.update({
    where: { id: request.id },
    data: { status: approve ? "APPROVED" : "DENIED", grantedMins: approve ? minutes : null, decidedById: parent.id, decidedAt: new Date() },
  });
  await audit(family.id, parent.id, approve ? "request.approved" : "request.denied", `${request.child.name}: ${request.appName}${approve ? ` +${minutes}m` : ""}`);
  revalidatePath("/requests");
  revalidatePath("/dashboard");
}

/** Give bonus time without waiting for a request (e.g. a reward). */
export async function grantTime(childId: string, form: FormData) {
  const { family, parent } = await requireEditor();
  const child = await loadChild(family.id, childId);
  const minutes = Math.max(5, Math.min(240, Number(form.get("minutes")) || 15));
  const { day } = localParts(new Date(), family.timeZone);
  await db.timeRequest.create({
    data: { childId: child.id, appId: "*", appName: "Screen time", minutes, grantedMins: minutes, day, status: "APPROVED", reason: "Given by a parent", decidedById: parent.id, decidedAt: new Date() },
  });
  await audit(family.id, parent.id, "time.granted", `${child.name} +${minutes}m today`);
  revalidatePath(`/children/${child.id}`);
}

export async function markAlertsRead(ids?: string[]) {
  const { family } = await requireFamily();
  await db.alert.updateMany({ where: { familyId: family.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

/** Clearing a tamper lock: the parent has looked at it, so the phone may unlock once signals are clean. */
export async function clearDeviceSignals(deviceId: string) {
  const { family, parent } = await requireEditor();
  const device = await db.device.findFirst({ where: { id: deviceId, child: { familyId: family.id } } });
  if (!device) return;
  await db.device.update({ where: { id: device.id }, data: { signals: {} } });
  await audit(family.id, parent.id, "device.tamper_cleared", device.name);
  revalidatePath(`/children/${device.childId}`);
}
