"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function deleteConversation(id: string) {
  const user = await requireUser();
  await db.conversation.deleteMany({ where: { id, userId: user.id } });
  redirect("/companion");
}
