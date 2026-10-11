import "server-only";
import { deviceState } from "./engine";
import { grantsFor, usageFor } from "./device";
import type { Rules } from "./rules";
import { localParts } from "./time";
import { isTampered, type Signals } from "./tamper";

/** What a child's phones are allowed to do right now, as the parent sees it. */
export async function childSnapshot(child: { id: string; rules: Rules; devices: { signals: unknown; revokedAt: Date | null }[] }, timeZone: string, now = new Date()) {
  const { day } = localParts(now, timeZone);
  const [{ usage, rows }, grants] = await Promise.all([usageFor(child.id, day), grantsFor(child.id, day)]);
  const tampered = child.devices.some((d) => !d.revokedAt && isTampered((d.signals ?? {}) as Signals));
  const state = deviceState(child.rules, { now, timeZone, usage, grants, tampered });
  const topApps = Object.values(
    rows.reduce<Record<string, { appId: string; appName: string; category: string; minutes: number }>>((acc, r) => {
      const a = (acc[r.appId] ??= { appId: r.appId, appName: r.appName, category: r.category, minutes: 0 });
      a.minutes += r.minutes;
      return acc;
    }, {}),
  ).sort((a, b) => b.minutes - a.minutes);
  return { day, state, usage, grants, topApps };
}
