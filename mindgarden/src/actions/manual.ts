"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { remember } from "@/lib/memory";
import { MANUAL_CATEGORIES } from "@/lib/manual";

export async function addManualEntry(form: FormData) {
  const user = await requireUser();
  const category = z.enum(MANUAL_CATEGORIES).parse(form.get("category"));
  const content = z.string().trim().min(1).max(280).parse(form.get("content"));
  await remember(user.id, category, content, "user");
  revalidatePath("/manual");
}

export async function updateManualEntry(id: string, content: string) {
  const user = await requireUser();
  const text = z.string().trim().min(1).max(280).parse(content);
  await db.manualEntry.updateMany({ where: { id, userId: user.id }, data: { content: text } });
  revalidatePath("/manual");
}

export async function deleteManualEntry(id: string) {
  const user = await requireUser();
  await db.manualEntry.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/manual");
}
