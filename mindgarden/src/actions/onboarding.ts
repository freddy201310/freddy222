"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { remember } from "@/lib/memory";

const OnboardingSchema = z.object({
  interests: z.array(z.string().max(60)).max(20),
  goals: z.array(z.string().trim().max(200)).max(5),
  values: z.array(z.string().max(60)).max(10),
  helpers: z.array(z.string().max(80)).max(15),
  stressors: z.array(z.string().max(80)).max(15),
  tone: z.enum(["warm", "direct", "playful", "calm"]),
  scene: z.enum(["garden", "beach", "forest", "cabin", "mountain", "fantasy"]),
  aiMemoryEnabled: z.boolean(),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export async function completeOnboarding(input: OnboardingInput) {
  const user = await requireUser();
  const data = OnboardingSchema.parse(input);

  await db.user.update({
    where: { id: user.id },
    data: { interests: data.interests, companionTone: data.tone, aiMemoryEnabled: data.aiMemoryEnabled, onboarded: true },
  });
  for (const g of data.goals.filter(Boolean)) await remember(user.id, "GOAL", g, "user");
  for (const v of data.values) await remember(user.id, "VALUE", v, "user");
  for (const h of data.helpers) await remember(user.id, "HELPFUL_ACTIVITY", h, "user");
  for (const s of data.stressors) await remember(user.id, "STRESSOR", s, "user");
  await db.happyPlace.upsert({
    where: { userId: user.id },
    create: { userId: user.id, scene: data.scene },
    update: { scene: data.scene },
  });
  redirect("/dashboard?welcome=1");
}
