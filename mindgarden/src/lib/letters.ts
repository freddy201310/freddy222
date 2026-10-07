import "server-only";
import { db } from "./db";

/**
 * Mark letters whose delivery date has arrived as delivered. Runs on a schedule via
 * /api/cron/deliver-letters and also opportunistically whenever a user opens the app,
 * so letters arrive on time even without a cron configured.
 * This is the hook to extend with email/push delivery.
 */
export async function deliverDueLetters(userId?: string) {
  const res = await db.letter.updateMany({
    where: { deliveredAt: null, deliverAt: { lte: new Date() }, ...(userId ? { userId } : {}) },
    data: { deliveredAt: new Date() },
  });
  return res.count;
}
