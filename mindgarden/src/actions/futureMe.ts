"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const Schema = z.object({
  horizon: z.enum(["1 year", "3 years", "5 years", "10 years", "20 years"]),
  whoBecome: z.string().trim().max(2000),
  habits: z.string().trim().max(2000),
  goals: z.string().trim().max(2000),
  admire: z.string().trim().max(2000),
  values: z.string().trim().max(2000),
});

export async function saveFutureSelf(form: FormData) {
  const user = await requireUser();
  const data = Schema.parse(Object.fromEntries(form));
  await db.futureSelf.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  revalidatePath("/future-me");
}

export async function newFutureMeConversation() {
  const user = await requireUser();
  await db.conversation.create({ data: { userId: user.id, mode: "future-me", title: "Talking with Future Me" } });
  revalidatePath("/future-me");
}
