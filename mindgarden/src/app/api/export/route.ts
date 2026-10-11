import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Everything we hold about the signed-in user, as one portable JSON file. */
export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;
  const [conversations, manual, journal, moods, happyPlace, futureSelf, letters, daily, resets] = await Promise.all([
    db.conversation.findMany({ where: { userId }, include: { messages: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
    db.manualEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.journalEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.moodLog.findMany({ where: { userId }, orderBy: { day: "asc" } }),
    db.happyPlace.findUnique({ where: { userId } }),
    db.futureSelf.findUnique({ where: { userId } }),
    db.letter.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.dailyContent.findMany({ where: { userId }, orderBy: { day: "asc" } }),
    db.resetPlan.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);
  const { passwordHash: _omit, ...profile } = user;
  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), format: "mindgarden-export-v1", profile, lifeManual: manual, conversations, journal, moodCheckIns: moods, happyPlace, futureSelf, letters, dailyEncouragement: daily, resetPlans: resets },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mindgarden-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
