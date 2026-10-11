import type { Rules, Schedule } from "./rules";
import { localParts, toMinutes } from "./time";

// The enforcement engine. It is pure: the same inputs always give the same answer, and the
// only clock it trusts is the server's. Devices receive its output; they never decide for themselves.

export type Grant = { appId: string; minutes: number }; // appId "*" = overall screen time
export type UsageToday = { total: number; byApp: Record<string, number>; byCategory: Record<string, number> };

export type Context = {
  now: Date;
  timeZone: string;
  usage: UsageToday;
  grants: Grant[];
  tampered?: boolean; // the device reported a bypass attempt
};

export type Mode = "open" | "paused" | "tamper" | "schedule" | "limit";

export type DeviceState = {
  day: string;
  mode: Mode;
  reason: string;
  schedule: { label: string; kind: Schedule["kind"]; allowCategories: string[]; endsAtMinute: number } | null;
  dailyLimit: number | null; // including approved bonus time
  remaining: number | null;
};

export type AppDecision = { allowed: boolean; reason: string; remaining: number | null };

const ALWAYS = "always-allowed";

function scheduleActive(s: Schedule, weekday: number, minute: number) {
  const start = toMinutes(s.start);
  const end = toMinutes(s.end);
  if (start === end) return false;
  if (start < end) return s.days.includes(weekday) && minute >= start && minute < end;
  // Overnight block, e.g. 21:00–07:00: the late part belongs to today, the early part to yesterday.
  const yesterday = (weekday + 6) % 7;
  return (minute >= start && s.days.includes(weekday)) || (minute < end && s.days.includes(yesterday));
}

const granted = (grants: Grant[], appId: string) => grants.filter((g) => g.appId === appId).reduce((n, g) => n + g.minutes, 0);

export function deviceState(rules: Rules, ctx: Context): DeviceState {
  const { day, weekday, minuteOfDay } = localParts(ctx.now, ctx.timeZone);
  const base = rules.dailyLimit[weekday];
  const dailyLimit = base === null ? null : base + granted(ctx.grants, "*");
  const remaining = dailyLimit === null ? null : Math.max(0, dailyLimit - ctx.usage.total);
  const active = rules.schedules.find((s) => scheduleActive(s, weekday, minuteOfDay));
  const schedule = active
    ? { label: active.label, kind: active.kind, allowCategories: active.allowCategories, endsAtMinute: toMinutes(active.end) }
    : null;
  const state = { day, schedule, dailyLimit, remaining };

  if (ctx.tampered && rules.tamper.lockOnTamper) return { ...state, mode: "tamper", reason: "Locked until a parent reviews a bypass attempt" };
  if (rules.paused) return { ...state, mode: "paused", reason: "A parent paused this device" };
  if (schedule) return { ...state, mode: "schedule", reason: `${schedule.label} until ${fmt(schedule.endsAtMinute)}` };
  if (remaining === 0) return { ...state, mode: "limit", reason: "Daily screen time is used up" };
  return { ...state, mode: "open", reason: "Open" };
}

/**
 * Decide whether one app may be used right now. Bonus time is scoped to the app it was
 * granted for, so extra time for homework never unlocks games.
 */
export function appDecision(rules: Rules, ctx: Context, appId: string, category: string | null, isAlwaysAllowed = false): AppDecision {
  if (isAlwaysAllowed) return { allowed: true, reason: ALWAYS, remaining: null };
  const appRule = rules.apps.find((a) => a.appId === appId);
  if (appRule?.rule === "always") return { allowed: true, reason: ALWAYS, remaining: null };

  const state = deviceState(rules, ctx);
  if (state.mode === "tamper" || state.mode === "paused") return { allowed: false, reason: state.reason, remaining: 0 };
  if (state.mode === "schedule" && !(category && state.schedule!.allowCategories.includes(category))) {
    return { allowed: false, reason: state.reason, remaining: 0 };
  }
  if (appRule?.rule === "block") return { allowed: false, reason: "Blocked by a parent", remaining: 0 };

  const appBonus = granted(ctx.grants, appId);
  const limits: number[] = [];
  if (appRule?.rule === "limit" && appRule.minutes !== undefined) {
    limits.push(appRule.minutes + appBonus - (ctx.usage.byApp[appId] ?? 0));
  } else if (category) {
    const cat = rules.categories[category];
    if (cat?.rule === "block" && appBonus === 0) return { allowed: false, reason: "This kind of app is blocked", remaining: 0 };
    if (cat?.rule === "block") limits.push(appBonus - (ctx.usage.byApp[appId] ?? 0));
    if (cat?.rule === "limit" && cat.minutes !== undefined) {
      limits.push(cat.minutes + appBonus - (ctx.usage.byCategory[category] ?? 0));
    }
  }
  // Education apps allowed during school hours do not draw down the daily total.
  const exemptFromDaily = state.mode === "schedule";
  if (state.remaining !== null && !exemptFromDaily) limits.push(state.remaining + appBonus);

  if (limits.length === 0) return { allowed: true, reason: "Allowed", remaining: null };
  const remaining = Math.max(0, Math.min(...limits));
  return remaining > 0
    ? { allowed: true, reason: "Allowed", remaining }
    : { allowed: false, reason: "Time limit reached", remaining: 0 };
}

/** Decide a website. Allow-list entries win, then the block list, then categories. */
export function webDecision(rules: Rules, host: string, categories: string[]): { allowed: boolean; reason: string } {
  const h = host.toLowerCase().replace(/\.$/, "");
  const matches = (d: string) => h === d || h.endsWith(`.${d}`);
  if (rules.web.allowDomains.some(matches)) return { allowed: true, reason: "On the allowed list" };
  if (rules.web.blockDomains.some(matches)) return { allowed: false, reason: "Blocked by a parent" };
  if (rules.web.allowListOnly) return { allowed: false, reason: "Only approved sites are allowed" };
  const hit = categories.find((c) => rules.web.blockCategories.includes(c));
  if (hit) return { allowed: false, reason: `Blocked category: ${hit}` };
  return { allowed: true, reason: "Allowed" };
}

function fmt(minuteOfDay: number) {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  const suffix = h < 12 ? "am" : "pm";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${suffix}`;
}
