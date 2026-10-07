"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { remember } from "@/lib/memory";

export async function toggleChallenge(id: string) {
  const user = await requireUser();
  const card = await db.dailyContent.findFirst({ where: { id, userId: user.id } });
  if (!card) return;
  await db.dailyContent.update({ where: { id }, data: { challengeDone: !card.challengeDone } });
  if (!card.challengeDone) await remember(user.id, "SUCCESS", `Completed a daily challenge: ${card.challenge}`, "checkin");
  revalidatePath("/dashboard");
}
