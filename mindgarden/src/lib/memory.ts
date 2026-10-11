import "server-only";
import type { ManualCategory } from "@prisma/client";
import { db } from "./db";
import { CATEGORY_LABEL } from "./manual";
import { discoverPatterns } from "./insights";

export type UserContext = Awaited<ReturnType<typeof loadUserContext>>;

/** Everything the companion knows about a person, gathered from their own data. */
export async function loadUserContext(userId: string) {
  const [user, manual, futureSelf, moods, rated, journal, patterns] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.manualEntry.findMany({ where: { userId }, orderBy: [{ strength: "desc" }, { updatedAt: "desc" }], take: 80 }),
    db.futureSelf.findUnique({ where: { userId } }),
    db.moodLog.findMany({ where: { userId }, orderBy: { day: "desc" }, take: 7 }),
    db.message.findMany({
      where: { conversation: { userId }, role: "assistant", rating: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 16,
    }),
    db.journalEntry.findMany({
      where: { userId, aiSummary: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    discoverPatterns(userId),
  ]);
  return { user, manual, futureSelf, moods, rated, journal, patterns };
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

/** Render the user's context as plain text for the model. */
export function renderUserContext(ctx: UserContext): string {
  const lines: string[] = [];
  lines.push(`Name: ${ctx.user.name}`);
  if (ctx.user.interests.length) lines.push(`Interests: ${ctx.user.interests.join(", ")}`);
  lines.push(`Preferred companion style: ${ctx.user.companionTone}`);

  const byCat = new Map<ManualCategory, string[]>();
  for (const e of ctx.manual) {
    const list = byCat.get(e.category) ?? [];
    list.push(e.strength > 1 ? `${e.content} (noticed ${e.strength}x)` : e.content);
    byCat.set(e.category, list);
  }
  if (byCat.size) {
    lines.push("", "## Personal Life Manual");
    for (const [cat, items] of byCat) lines.push(`${CATEGORY_LABEL[cat]}: ${items.slice(0, 10).join("; ")}`);
  }

  const fs = ctx.futureSelf;
  if (fs && (fs.whoBecome || fs.goals || fs.habits)) {
    lines.push("", `## Future Me (${fs.horizon} from now)`);
    if (fs.whoBecome) lines.push(`Who they want to become: ${fs.whoBecome}`);
    if (fs.habits) lines.push(`Habits they want: ${fs.habits}`);
    if (fs.goals) lines.push(`Goals: ${fs.goals}`);
    if (fs.values) lines.push(`Values: ${fs.values}`);
    if (fs.admire) lines.push(`People/qualities they admire: ${fs.admire}`);
  }

  if (ctx.moods.length) {
    lines.push("", "## Recent check-ins (1 = low, 5 = high; for stress 5 = most stressed)");
    for (const m of ctx.moods.slice(0, 5)) {
      lines.push(
        `${m.day}: mood ${m.mood}, energy ${m.energy}, stress ${m.stress}, focus ${m.focus}, sleep ${m.sleep}${m.note ? ` — "${clip(m.note, 120)}"` : ""}`,
      );
    }
  }

  if (ctx.patterns.length) {
    lines.push("", "## Patterns observed in their own data");
    for (const p of ctx.patterns) lines.push(`- ${p.text}`);
  }

  const landed = ctx.rated.filter((m) => m.rating === "LOVED_IT" || m.rating === "HELPFUL");
  const missed = ctx.rated.filter((m) => m.rating === "DOESNT_FIT" || m.rating === "NOT_HELPFUL");
  if (landed.length || missed.length) {
    lines.push("", "## How they've rated your past replies — lean toward what landed, away from what didn't");
    for (const m of landed.slice(0, 5))
      lines.push(`${m.rating === "LOVED_IT" ? "LOVED" : "Helpful"}: "${clip(m.content, 220)}"`);
    for (const m of missed.slice(0, 5))
      lines.push(`${m.rating === "DOESNT_FIT" ? "Doesn't fit them" : "Not helpful"}: "${clip(m.content, 220)}"`);
  }

  if (ctx.journal.length) {
    lines.push("", "## Recent journal themes");
    for (const j of ctx.journal) lines.push(`- ${clip(j.aiSummary ?? "", 240)}`);
  }

  return lines.join("\n");
}

/**
 * Add or reinforce a Life Manual entry. Near-duplicates (same category, same normalized text)
 * strengthen the existing entry instead of creating a new one.
 */
export async function remember(userId: string, category: ManualCategory, content: string, source: string) {
  const text = content.trim().replace(/\s+/g, " ");
  if (!text) return;
  const norm = text.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const existing = await db.manualEntry.findMany({ where: { userId, category } });
  const match = existing.find((e) => e.content.toLowerCase().replace(/[^a-z0-9 ]/g, "") === norm);
  if (match) {
    await db.manualEntry.update({ where: { id: match.id }, data: { strength: { increment: 1 } } });
  } else {
    await db.manualEntry.create({ data: { userId, category, content: clip(text, 280), source } });
  }
}
