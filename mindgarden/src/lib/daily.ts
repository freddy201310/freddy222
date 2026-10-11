import "server-only";
import { z } from "zod";
import { db } from "./db";
import { dayKey } from "./dates";
import { generateStructured } from "./ai";
import { DAILY_SYSTEM } from "./prompts";
import { loadUserContext, renderUserContext } from "./memory";
import { fallbackDaily } from "./fallbacks";

const DailySchema = z.object({
  thought: z.string(),
  thoughtSource: z.string(),
  question: z.string(),
  encouragement: z.string(),
  challenge: z.string(),
});

/** Today's card, generated once per day per user and then cached. */
export async function getDaily(userId: string) {
  const day = dayKey();
  const existing = await db.dailyContent.findUnique({ where: { userId_day: { userId, day } } });
  if (existing) return existing;

  const ctx = await loadUserContext(userId);
  const recentChallenges = await db.dailyContent.findMany({ where: { userId }, orderBy: { day: "desc" }, take: 5 });
  const ai = await generateStructured({
    system: DAILY_SYSTEM,
    schema: DailySchema,
    prompt: [
      renderUserContext(ctx),
      "",
      `Recent challenges (avoid repeating): ${recentChallenges.map((c) => c.challenge).join(" | ") || "none"}`,
      `Today is ${new Date().toDateString()}. Write today's card.`,
    ].join("\n"),
  });
  const content = ai ? { ...ai, thoughtSource: ai.thoughtSource.trim() || null } : fallbackDaily(ctx, day);
  return db.dailyContent.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, ...content },
    update: {},
  });
}
