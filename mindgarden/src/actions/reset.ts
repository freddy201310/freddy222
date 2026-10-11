"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateStructured } from "@/lib/ai";
import { RESET_SYSTEM } from "@/lib/prompts";
import { loadUserContext, remember, renderUserContext } from "@/lib/memory";
import { fallbackReset, type ResetStep } from "@/lib/fallbacks";
import { needsSupport } from "@/lib/safety";

const KINDS = ["breathing", "journal", "movement", "reflection", "puzzle", "favorite", "next-step"] as const;

const PlanSchema = z.object({
  opening: z.string(),
  steps: z.array(z.object({ kind: z.enum(KINDS), title: z.string(), instruction: z.string(), minutes: z.number() })),
});

export type ResetResult = { id: string; opening: string; steps: ResetStep[]; support: boolean };

export async function createResetPlan(feelings: string[], detail: string): Promise<ResetResult> {
  const user = await requireUser();
  const feeling = [feelings.join(", "), detail.trim()].filter(Boolean).join(" — ").slice(0, 1000);
  const ctx = await loadUserContext(user.id);
  const recent = await db.resetPlan.findMany({ where: { userId: user.id, helped: { not: null } }, orderBy: { createdAt: "desc" }, take: 5 });

  const ai = await generateStructured({
    system: RESET_SYSTEM,
    schema: PlanSchema,
    prompt: [
      renderUserContext(ctx),
      "",
      recent.length
        ? `Past resets: ${recent.map((r) => `${(r.steps as ResetStep[]).map((s) => s.title).join(" → ")} (${r.helped ? "helped" : "didn't help"})`).join("; ")}`
        : "",
      `Right now they feel: ${feeling || "overwhelmed (no details given)"}`,
    ].join("\n"),
  });
  const plan = ai && ai.steps.length ? { opening: ai.opening, steps: ai.steps.slice(0, 5) } : fallbackReset(ctx, feeling);
  const saved = await db.resetPlan.create({ data: { userId: user.id, feeling: feeling || "unspecified", steps: plan.steps } });
  return { id: saved.id, ...plan, support: needsSupport(detail) };
}

export async function rateResetPlan(id: string, helped: boolean, helpfulSteps: string[]) {
  const user = await requireUser();
  const plan = await db.resetPlan.findFirst({ where: { id, userId: user.id } });
  if (!plan) return;
  await db.resetPlan.update({ where: { id }, data: { helped } });
  if (helped && user.aiMemoryEnabled) {
    for (const title of helpfulSteps.slice(0, 3)) await remember(user.id, "HELPFUL_ACTIVITY", title, "reset");
  }
}
