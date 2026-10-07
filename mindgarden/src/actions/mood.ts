"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";

const scale = z.coerce.number().int().min(1).max(5);
const MoodSchema = z.object({
  mood: scale,
  energy: scale,
  stress: scale,
  focus: scale,
  sleep: scale,
  note: z.string().trim().max(1000).optional(),
});

export async function saveMood(input: z.input<typeof MoodSchema>) {
  const user = await requireUser();
  const data = MoodSchema.parse(input);
  const day = dayKey();
  const note = data.note || null;
  await db.moodLog.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day, ...data, note },
    update: { ...data, note },
  });
  revalidatePath("/dashboard");
  revalidatePath("/mood");
}
