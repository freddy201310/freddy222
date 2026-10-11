"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addMonths } from "@/lib/dates";

const Schema = z.object({
  recipient: z.enum(["self", "goal", "milestone"]),
  subject: z.string().trim().min(1, "Give your letter a subject").max(140),
  body: z.string().trim().min(1, "Write your letter").max(20000),
  when: z.enum(["1m", "6m", "1y", "custom"]),
  customDate: z.string().optional(),
});

export type LetterState = { error?: string } | undefined;

export async function createLetter(_: LetterState, form: FormData): Promise<LetterState> {
  const user = await requireUser();
  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { when, customDate, ...data } = parsed.data;

  const now = new Date();
  let deliverAt: Date;
  if (when === "custom") {
    if (!customDate) return { error: "Pick a delivery date" };
    deliverAt = new Date(`${customDate}T09:00:00`);
    if (Number.isNaN(deliverAt.getTime()) || deliverAt <= now) return { error: "Choose a date in the future" };
  } else {
    deliverAt = addMonths(now, when === "1m" ? 1 : when === "6m" ? 6 : 12);
  }
  await db.letter.create({ data: { userId: user.id, ...data, deliverAt } });
  revalidatePath("/letters");
  redirect("/letters?sent=1");
}

export async function openLetter(id: string) {
  const user = await requireUser();
  await db.letter.updateMany({ where: { id, userId: user.id, deliveredAt: { not: null }, openedAt: null }, data: { openedAt: new Date() } });
  revalidatePath("/letters");
}

export async function deleteLetter(id: string) {
  const user = await requireUser();
  await db.letter.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/letters");
}
