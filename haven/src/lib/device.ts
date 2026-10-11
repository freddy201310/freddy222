import "server-only";
import { z } from "zod";
import { db } from "./db";
import { sha256 } from "./tokens";
import { ageOf, parseRules, APP_CATEGORIES } from "./rules";
import { appDecision, deviceState, type Context, type Grant } from "./engine";
import { analyzeHeartbeat, isTampered, type Signals } from "./tamper";
import { localParts } from "./time";
import { raiseAlert } from "./family";
import { ipFrom, rateLimit } from "./ratelimit";

/** Per-device (or per-IP before enrollment) request budget. Returns a 429 response when exceeded. */
export async function deviceRateLimit(req: Request, scope: string, max: number, windowSeconds: number, id?: string) {
  const who = id ?? ipFrom(req.headers);
  if (await rateLimit(`dev:${scope}:${who}`, max, windowSeconds)) return null;
  return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(windowSeconds) } });
}

/** Authenticate a phone by its bearer token. Revoked devices are refused. */
export async function deviceFromRequest(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  return db.device.findFirst({
    where: { tokenHash: sha256(token), revokedAt: null },
    include: { child: { include: { policy: true, family: true } } },
  });
}

export type AuthedDevice = NonNullable<Awaited<ReturnType<typeof deviceFromRequest>>>;

/** Approved bonus time for today. */
export async function grantsFor(childId: string, day: string): Promise<Grant[]> {
  const approved = await db.timeRequest.findMany({ where: { childId, day, status: "APPROVED" } });
  return approved.map((r) => ({ appId: r.appId, minutes: r.grantedMins ?? 0 }));
}

/** Screen time is shared across all of a child's phones, so switching devices doesn't reset the clock. */
export async function usageFor(childId: string, day: string) {
  const rows = await db.usage.findMany({ where: { day, device: { childId } } });
  const usage = { total: 0, byApp: {} as Record<string, number>, byCategory: {} as Record<string, number> };
  for (const r of rows) {
    usage.total += r.minutes;
    usage.byApp[r.appId] = (usage.byApp[r.appId] ?? 0) + r.minutes;
    if (r.category) usage.byCategory[r.category] = (usage.byCategory[r.category] ?? 0) + r.minutes;
  }
  return { usage, rows };
}

export const HeartbeatSchema = z.object({
  appliedPolicyVersion: z.number().int().min(0),
  deviceTime: z.string().datetime({ offset: true }),
  battery: z.number().int().min(0).max(100).optional(),
  osVersion: z.string().max(40).optional(),
  signals: z
    .object({
      timeZone: z.string().max(60).optional(),
      developerOptions: z.boolean().optional(),
      usbDebugging: z.boolean().optional(),
      vpnActive: z.boolean().optional(),
      privateDns: z.boolean().optional(),
      controlsPermissionRevoked: z.boolean().optional(),
      profileRemoved: z.boolean().optional(),
      secondaryUser: z.boolean().optional(),
      assistedAccess: z.boolean().optional(),
      safeMode: z.boolean().optional(),
      appCount: z.number().int().min(0).optional(),
    })
    .default({}),
  location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional(),
  // Minutes used today per app, as counted by the phone's own usage stats.
  usage: z
    .array(z.object({ appId: z.string().min(1).max(200), appName: z.string().max(80), category: z.string().max(40).default(""), minutes: z.number().int().min(0).max(1440) }))
    .max(500)
    .default([]),
});

export async function handleHeartbeat(device: AuthedDevice, input: z.infer<typeof HeartbeatSchema>, now = new Date()) {
  const { child } = device;
  const family = child.family;
  const rules = parseRules(child.policy?.rules, ageOf(child.birthYear));
  const policyVersion = child.policy?.version ?? 0;
  const { day } = localParts(now, family.timeZone);
  const clockSkewSeconds = Math.round((new Date(input.deviceTime).getTime() - now.getTime()) / 1000);
  const signals = input.signals as Signals;

  const findings = analyzeHeartbeat({
    deviceName: device.name,
    signals,
    previous: (device.signals ?? {}) as Signals,
    clockSkewSeconds,
    familyTimeZone: family.timeZone,
    appliedPolicyVersion: input.appliedPolicyVersion,
    currentPolicyVersion: policyVersion,
    policyChangedAt: child.policy?.updatedAt ?? now,
    now,
  });
  if (device.offlineAlertedAt) {
    findings.push({ kind: "back_online", severity: "INFO", message: `${device.name} is back online.` });
  }
  for (const f of findings) {
    // Don't repeat the same alert for the same phone more than every 6 hours.
    const recent = await db.alert.findFirst({ where: { deviceId: device.id, kind: f.kind, createdAt: { gt: new Date(now.getTime() - 6 * 3600_000) } } });
    if (!recent) await raiseAlert({ familyId: family.id, childId: child.id, deviceId: device.id, ...f });
  }

  await db.device.update({
    where: { id: device.id },
    data: {
      lastSeenAt: now,
      appliedPolicyVersion: input.appliedPolicyVersion,
      clockSkewSeconds,
      battery: input.battery,
      osVersion: input.osVersion ?? device.osVersion,
      signals,
      offlineAlertedAt: null,
      ...(input.location && rules.location.enabled ? { latitude: input.location.latitude, longitude: input.location.longitude, locationAt: now } : {}),
    },
  });

  // Usage only ever goes up within a day, so restarting the phone or clearing stats can't refund time.
  for (const u of input.usage) {
    const key = { deviceId_day_appId: { deviceId: device.id, day, appId: u.appId } };
    const existing = await db.usage.findUnique({ where: key });
    if (!existing) await db.usage.create({ data: { deviceId: device.id, day, ...u } });
    else if (u.minutes > existing.minutes) await db.usage.update({ where: key, data: { minutes: u.minutes, category: u.category || existing.category } });
  }

  return compiledPolicy(device, rules, policyVersion, signals, now);
}

/** Everything a phone needs to enforce rules until its next check-in. */
export async function compiledPolicy(device: AuthedDevice, rules = parseRules(device.child.policy?.rules, ageOf(device.child.birthYear)), policyVersion = device.child.policy?.version ?? 0, signals = (device.signals ?? {}) as Signals, now = new Date()) {
  const { child } = device;
  const { day } = localParts(now, child.family.timeZone);
  const [{ usage, rows }, grants] = await Promise.all([usageFor(child.id, day), grantsFor(child.id, day)]);
  const ctx: Context = { now, timeZone: child.family.timeZone, usage, grants, tampered: isTampered(signals) };
  const apps = Object.fromEntries(
    [...new Map(rows.map((r) => [r.appId, r.category])).entries(), ...rules.apps.map((a) => [a.appId, ""] as const)].map(([appId, category]) => [
      appId,
      appDecision(rules, ctx, appId, category || null),
    ]),
  );
  const categories = Object.fromEntries(APP_CATEGORIES.map((c) => [c.id, appDecision(rules, ctx, `category:${c.id}`, c.id)]));
  return {
    serverTime: now.toISOString(), // phones keep time from this, not from their own clock
    timeZone: child.family.timeZone, // "today" for usage counting is the family's day, not the phone's
    nextCheckInSeconds: 60,
    policyVersion,
    state: deviceState(rules, ctx),
    rules,
    grants,
    apps,
    categories,
  };
}

/**
 * iPhones can't run a background service, so they check in when iOS lets them (screen-time events,
 * background refresh, opening the app) — often less than hourly. Waiting at least 4 hours avoids
 * false "offline" alarms; Android phones check in every minute and use the parent's setting.
 */
export const offlineWindowMinutes = (platform: "IOS" | "ANDROID", configured: number) => (platform === "IOS" ? Math.max(configured, 240) : configured);

/** Mark phones that stopped checking in. Silence is how a factory reset or removed app looks. */
export async function sweepOfflineDevices(now = new Date()) {
  const devices = await db.device.findMany({
    where: { revokedAt: null, offlineAlertedAt: null, lastSeenAt: { not: null } },
    include: { child: { include: { policy: true } } },
  });
  let flagged = 0;
  for (const d of devices) {
    const rules = parseRules(d.child.policy?.rules, ageOf(d.child.birthYear));
    const windowMinutes = offlineWindowMinutes(d.platform, rules.tamper.offlineAlertMinutes);
    if (now.getTime() - d.lastSeenAt!.getTime() < windowMinutes * 60_000) continue;
    await db.device.update({ where: { id: d.id }, data: { offlineAlertedAt: now } });
    await raiseAlert({
      familyId: d.child.familyId,
      childId: d.childId,
      deviceId: d.id,
      kind: "offline",
      severity: "WARNING",
      message: `${d.name} hasn't checked in for over ${windowMinutes >= 120 ? `${Math.round(windowMinutes / 60)} hours` : `${windowMinutes} minutes`}. It may be off, out of signal, reset, or the Haven app was removed.`,
    });
    flagged++;
  }
  return flagged;
}
