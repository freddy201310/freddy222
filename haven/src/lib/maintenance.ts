import "server-only";
import { db } from "./db";
import { sweepOfflineDevices } from "./device";
import { sweepRateLimits } from "./ratelimit";

const DAY = 86_400_000;

/** Offline checks plus data retention. Retention periods match the Privacy Policy. */
export async function runMaintenance(now = new Date()) {
  const offline = await sweepOfflineDevices(now);
  const cutoffDay = new Date(now.getTime() - 90 * DAY).toISOString().slice(0, 10);
  const [usage, alerts, resets, codes, requests] = await Promise.all([
    db.usage.deleteMany({ where: { day: { lt: cutoffDay } } }),
    db.alert.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 365 * DAY) } } }),
    db.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.enrollmentCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - DAY) } } }),
    // Requests nobody answered by the end of their day can't be used any more.
    db.timeRequest.updateMany({ where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - DAY) } }, data: { status: "EXPIRED" } }),
  ]);
  await Promise.all([sweepRateLimits(), db.session.deleteMany({ where: { expiresAt: { lt: now } } })]);
  return { offline, deleted: { usage: usage.count, alerts: alerts.count, resets: resets.count, codes: codes.count }, expiredRequests: requests.count };
}
