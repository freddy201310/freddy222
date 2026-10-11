"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateStructured } from "@/lib/ai";
import { JOURNAL_INSIGHT_SYSTEM } from "@/lib/prompts";
import { MANUAL_CATEGORIES } from "@/lib/manual";
import { remember } from "@/lib/memory";
import { MODE_BY_ID } from "@/lib/journal";

const EntrySchema = z.object({
  mode: z.enum(["BRAIN_DUMP", "GRATITUDE", "DAILY_REFLECTION", "GOAL_TRACKING", "PERSONAL_GROWTH"]),
  title: z.string().trim().max(120).optional(),
  prompt: z.string().trim().max(400).optional(),
  content: z.string().trim().min(1, "Write a little something first").max(20000),
});

const SummarySchema = z.object({ summary: z.string() });

export async function saveJournalEntry(form: FormData) {
  const user = await requireUser();
  const data = EntrySchema.parse({
    mode: form.get("mode"),
    title: form.get("title") || undefined,
    prompt: form.get("prompt") || undefined,
    content: form.get("content"),
  });
  const entry = await db.journalEntry.create({ data: { userId: user.id, ...data } });

  // A one-line reflection per entry, generated after the response so saving stays instant.
  after(async () => {
    const res = await generateStructured({
      system: "Summarize this personal journal entry in one warm, second-person sentence capturing its main theme or feeling. No advice, no diagnosis.",
      prompt: `Mode: ${MODE_BY_ID[data.mode].label}\n\n${data.content}`,
      schema: SummarySchema,
    });
    if (res) await db.journalEntry.update({ where: { id: entry.id }, data: { aiSummary: res.summary } });
  });

  revalidatePath("/journal");
  redirect(`/journal/${entry.id}`);
}

export async function deleteJournalEntry(id: string) {
  const user = await requireUser();
  await db.journalEntry.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/journal");
  redirect("/journal");
}

const InsightSchema = z.object({
  reflection: z.string(),
  themes: z.array(z.string()),
  manualItems: z.array(z.object({ category: z.enum(MANUAL_CATEGORIES), content: z.string() })),
});

export type JournalInsight = { reflection: string; themes: string[]; added: number } | { error: string };

export async function generateJournalInsights(): Promise<JournalInsight> {
  const user = await requireUser();
  const entries = await db.journalEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  if (entries.length < 2) return { error: "Write at least two entries and I'll start noticing patterns." };
  const res = await generateStructured({
    system: JOURNAL_INSIGHT_SYSTEM,
    schema: InsightSchema,
    effort: "medium",
    prompt: entries
      .map((e) => `### ${e.createdAt.toDateString()} — ${MODE_BY_ID[e.mode].label}${e.title ? `: ${e.title}` : ""}\n${e.content}`)
      .join("\n\n"),
  });
  if (!res) return { error: "Insights need the AI companion, which isn't available right now. Your entries are safe — try again later." };
  let added = 0;
  if (user.aiMemoryEnabled) {
    for (const item of res.manualItems.slice(0, 5)) {
      await remember(user.id, item.category, item.content, "journal");
      added++;
    }
  }
  return { reflection: res.reflection, themes: res.themes, added };
}
