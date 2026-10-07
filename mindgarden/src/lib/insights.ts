import "server-only";
import { db } from "./db";
import { dayKey, daysAgo } from "./dates";

export type Pattern = { kind: "mood" | "focus" | "motivation" | "setback"; text: string };

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Honest, simple pattern discovery from the user's own check-ins and activity.
 * We only report a pattern when there is enough data and a meaningful gap, and we phrase it
 * as an observation, never a conclusion.
 */
export async function discoverPatterns(userId: string): Promise<Pattern[]> {
  const since = daysAgo(90);
  const [moods, journal, daily, resets] = await Promise.all([
    db.moodLog.findMany({ where: { userId, createdAt: { gte: since } } }),
    db.journalEntry.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.dailyContent.findMany({ where: { userId, challengeDone: true, createdAt: { gte: since } }, select: { day: true } }),
    db.resetPlan.findMany({ where: { userId, helped: { not: null } }, select: { helped: true, steps: true } }),
  ]);

  const out: Pattern[] = [];
  if (moods.length >= 5) {
    const journalDays = new Set(journal.map((j) => dayKey(j.createdAt)));
    const challengeDays = new Set(daily.map((d) => d.day));

    const compare = (
      split: (m: (typeof moods)[number]) => boolean,
      metric: "mood" | "focus" | "energy",
      label: string,
      kind: Pattern["kind"],
    ) => {
      const yes = moods.filter(split).map((m) => m[metric]);
      const no = moods.filter((m) => !split(m)).map((m) => m[metric]);
      if (yes.length < 2 || no.length < 2) return;
      const gap = avg(yes) - avg(no);
      if (Math.abs(gap) >= 0.5) {
        out.push({
          kind,
          text: `Your ${metric} has averaged ${avg(yes).toFixed(1)} on days ${label}, vs ${avg(no).toFixed(1)} otherwise.`,
        });
      }
    };

    compare((m) => journalDays.has(m.day), "mood", "you journaled", "mood");
    compare((m) => challengeDays.has(m.day), "energy", "you completed your daily challenge", "motivation");
    compare((m) => m.sleep >= 4, "focus", "after good sleep (4–5)", "focus");
    compare((m) => m.sleep >= 4, "mood", "after good sleep (4–5)", "mood");
    compare((m) => m.stress >= 4, "focus", "with high stress", "setback");
  }

  const rated = resets.filter((r) => r.helped !== null);
  if (rated.length >= 3) {
    const helped = rated.filter((r) => r.helped).length;
    out.push({ kind: "mood", text: `Reset plans helped ${helped} of the last ${rated.length} times you used one.` });
  }
  return out;
}
