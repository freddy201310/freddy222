import { z } from "zod";

// The full rule set for one child. Stored as JSON on Policy.rules and validated on every read
// and write, so a malformed rule can never reach a device.

export const APP_CATEGORIES = [
  { id: "social", label: "Social media" },
  { id: "games", label: "Games" },
  { id: "video", label: "Video & streaming" },
  { id: "messaging", label: "Messaging" },
  { id: "browsers", label: "Web browsers" },
  { id: "shopping", label: "Shopping" },
  { id: "education", label: "School & learning" },
  { id: "creativity", label: "Creativity" },
] as const;

export const WEB_CATEGORIES = [
  { id: "adult", label: "Adult & explicit content" },
  { id: "gambling", label: "Gambling" },
  { id: "drugs", label: "Drugs & alcohol" },
  { id: "violence", label: "Violence & gore" },
  { id: "weapons", label: "Weapons" },
  { id: "hate", label: "Hate & extremism" },
  { id: "self-harm", label: "Self-harm & eating disorders" },
  { id: "dating", label: "Dating" },
  { id: "proxies", label: "Proxies, VPNs & filter-bypass sites" },
  { id: "anonymous-chat", label: "Anonymous chat" },
  { id: "social", label: "Social media" },
  { id: "gaming", label: "Gaming sites" },
] as const;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const minutes = z.number().int().min(0).max(24 * 60);
const domain = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?=.{1,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/, "Enter a domain like example.com");

export const ScheduleSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1).max(40),
  kind: z.enum(["downtime", "school", "homework"]),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  start: hhmm,
  end: hhmm, // may be earlier than start: the block then runs past midnight
  // Categories still usable during this block (always-allowed apps are usable regardless).
  allowCategories: z.array(z.string()).default([]),
});

export const AppRuleSchema = z.object({
  appId: z.string().trim().min(1).max(200), // iOS bundle id or Android package name
  name: z.string().trim().min(1).max(80),
  rule: z.enum(["always", "block", "limit"]),
  minutes: minutes.optional(),
});

export const RulesSchema = z.object({
  paused: z.boolean().default(false), // "lock now": everything but always-allowed apps
  dailyLimit: z.array(minutes.nullable()).length(7), // index = weekday (0 = Sunday); null = no limit
  schedules: z.array(ScheduleSchema).max(20),
  categories: z.record(z.string(), z.object({ rule: z.enum(["allow", "block", "limit"]), minutes: minutes.optional() })),
  apps: z.array(AppRuleSchema).max(300),
  alwaysAllowed: z.object({
    phone: z.literal(true).default(true), // calls and emergency services can never be blocked
    maps: z.boolean().default(true),
    approvedContactsMessaging: z.boolean().default(true),
  }),
  installs: z.object({
    mode: z.enum(["ask", "allow", "block"]).default("ask"),
    maxAgeRating: z.enum(["4+", "9+", "12+", "17+"]).default("12+"),
  }),
  web: z.object({
    blockCategories: z.array(z.string()),
    blockDomains: z.array(domain).max(500),
    allowDomains: z.array(domain).max(500),
    allowListOnly: z.boolean().default(false),
    safeSearch: z.boolean().default(true),
    youtubeRestricted: z.boolean().default(true),
    filterInAppBrowsers: z.boolean().default(true),
    blockPrivateDnsAndVpn: z.boolean().default(true),
  }),
  requests: z.object({
    enabled: z.boolean().default(true),
    maxPerDay: z.number().int().min(0).max(20).default(3),
    maxMinutesPerRequest: z.number().int().min(5).max(240).default(30),
  }),
  communication: z.enum(["everyone", "contacts", "approved"]).default("contacts"),
  location: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
  tamper: z.object({
    lockOnTamper: z.boolean().default(true),
    offlineAlertMinutes: z.number().int().min(10).max(24 * 60).default(60),
  }),
});

export type Rules = z.infer<typeof RulesSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type AppRule = z.infer<typeof AppRuleSchema>;

/** Age-appropriate starting rules. Younger kids start stricter; parents adjust from here. */
export function defaultRules(age: number): Rules {
  const young = age < 10;
  const tween = age >= 10 && age < 13;
  const weekday = young ? 60 : tween ? 120 : 180;
  const weekend = young ? 120 : tween ? 180 : 240;
  const bedtime = young ? "19:30" : tween ? "20:30" : "21:30";
  return RulesSchema.parse({
    dailyLimit: [weekend, weekday, weekday, weekday, weekday, weekday, weekend],
    schedules: [
      { id: "bedtime", label: "Bedtime", kind: "downtime", days: [0, 1, 2, 3, 4, 5, 6], start: bedtime, end: "07:00", allowCategories: [] },
      { id: "school", label: "School hours", kind: "school", days: [1, 2, 3, 4, 5], start: "08:00", end: "15:00", allowCategories: ["education"] },
    ],
    categories: {
      social: young || tween ? { rule: "block" } : { rule: "limit", minutes: 60 },
      games: { rule: "limit", minutes: young ? 30 : 60 },
      video: { rule: "limit", minutes: young ? 45 : 90 },
      shopping: { rule: "block" },
      education: { rule: "allow" },
    },
    apps: [],
    alwaysAllowed: { phone: true, maps: true, approvedContactsMessaging: true },
    installs: { mode: "ask", maxAgeRating: young ? "9+" : tween ? "12+" : "17+" },
    web: {
      blockCategories: ["adult", "gambling", "drugs", "violence", "weapons", "hate", "self-harm", "dating", "proxies", "anonymous-chat", ...(young ? ["social"] : [])],
      blockDomains: [],
      allowDomains: [],
      allowListOnly: false,
    },
    requests: {},
    communication: young ? "approved" : "contacts",
    tamper: {},
  });
}

/** Read stored rules, falling back to defaults if a stored blob is ever invalid. */
export function parseRules(raw: unknown, age: number): Rules {
  const parsed = RulesSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultRules(age);
}

export const ageOf = (birthYear: number, now = new Date()) => now.getUTCFullYear() - birthYear;
