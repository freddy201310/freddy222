import "server-only";
import { z } from "zod";
import { generateStructured } from "./ai";
import { EXTRACTOR_SYSTEM } from "./prompts";
import { MANUAL_CATEGORIES } from "./manual";
import { db } from "./db";
import { remember } from "./memory";

export const ManualItems = z.object({
  items: z.array(z.object({ category: z.enum(MANUAL_CATEGORIES), content: z.string() })),
});

/** After a conversation turn, add anything durable the person revealed to their Life Manual. */
export async function learnFromExchange(userId: string, userText: string, assistantText: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.aiMemoryEnabled) return;
  const existing = await db.manualEntry.findMany({ where: { userId }, select: { category: true, content: true }, take: 120 });
  const result = await generateStructured({
    system: EXTRACTOR_SYSTEM,
    schema: ManualItems,
    prompt: [
      "Existing manual:",
      existing.map((e) => `- [${e.category}] ${e.content}`).join("\n") || "(empty)",
      "",
      "Latest exchange:",
      `PERSON: ${userText}`,
      `COMPANION: ${assistantText}`,
    ].join("\n"),
  });
  for (const item of result?.items.slice(0, 5) ?? []) await remember(userId, item.category, item.content, "companion");
}
