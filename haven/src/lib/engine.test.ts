import { test } from "node:test";
import assert from "node:assert/strict";
import { appDecision, deviceState, webDecision, type Context } from "./engine";
import { defaultRules } from "./rules";
import { analyzeHeartbeat, isTampered } from "./tamper";
import { base32Encode, totpCode, verifyTotp } from "./totp";

const TZ = "America/New_York";
// 2026-10-14 is a Wednesday. 16:00 UTC = 12:00 noon in New York (EDT).
const at = (iso: string) => new Date(iso);
const ctx = (now: string, over: Partial<Context> = {}): Context => ({
  now: at(now),
  timeZone: TZ,
  usage: { total: 0, byApp: {}, byCategory: {} },
  grants: [],
  ...over,
});

test("weekday afternoon with time left is open", () => {
  const rules = defaultRules(12);
  const s = deviceState(rules, ctx("2026-10-14T20:00:00Z")); // 4pm local
  assert.equal(s.mode, "open");
  assert.equal(s.remaining, 120);
});

test("overnight bedtime spans midnight using the family time zone", () => {
  const rules = defaultRules(12); // bedtime 20:30–07:00
  assert.equal(deviceState(rules, ctx("2026-10-15T01:00:00Z")).mode, "schedule"); // 9pm Wed
  assert.equal(deviceState(rules, ctx("2026-10-15T09:00:00Z")).mode, "schedule"); // 5am Thu
  assert.equal(deviceState(rules, ctx("2026-10-15T11:30:00Z")).mode, "open"); // 7:30am Thu, between bedtime and school
  assert.equal(deviceState(rules, ctx("2026-10-15T12:30:00Z")).mode, "schedule"); // 8:30am Thu = school
  assert.equal(deviceState(rules, ctx("2026-10-15T19:30:00Z")).mode, "open"); // 3:30pm Thu
});

test("school hours allow only education apps", () => {
  const rules = defaultRules(12);
  const c = ctx("2026-10-14T16:00:00Z"); // noon Wed
  assert.equal(appDecision(rules, c, "com.khan", "education").allowed, true);
  assert.equal(appDecision(rules, c, "com.roblox", "games").allowed, false);
  assert.equal(appDecision(rules, c, "com.apple.mobilephone", null, true).allowed, true);
});

test("daily limit locks non-essential apps once used up", () => {
  const rules = defaultRules(12);
  const c = ctx("2026-10-14T22:00:00Z", { usage: { total: 120, byApp: {}, byCategory: {} } });
  assert.equal(deviceState(rules, c).mode, "limit");
  assert.equal(appDecision(rules, c, "com.duolingo", "education").allowed, false);
});

test("bonus time is scoped to the one app it was approved for", () => {
  const rules = defaultRules(12);
  const usage = { total: 120, byApp: { "com.duolingo": 20 }, byCategory: { education: 20 } };
  const c = ctx("2026-10-14T22:00:00Z", { usage, grants: [{ appId: "com.duolingo", minutes: 15 }] });
  assert.equal(appDecision(rules, c, "com.duolingo", "education").remaining, 15);
  assert.equal(appDecision(rules, c, "com.roblox", "games").allowed, false);
});

test("category limits apply, and blocked categories stay blocked", () => {
  const rules = defaultRules(12);
  const c = ctx("2026-10-14T20:00:00Z", { usage: { total: 40, byApp: {}, byCategory: { games: 60 } } });
  assert.equal(appDecision(rules, c, "com.roblox", "games").allowed, false);
  assert.equal(appDecision(rules, c, "com.instagram", "social").allowed, false);
  assert.equal(appDecision(rules, c, "com.netflix", "video").remaining, 80);
});

test("pause and tamper lock everything except always-allowed", () => {
  const rules = { ...defaultRules(15), paused: true };
  const c = ctx("2026-10-14T20:00:00Z");
  assert.equal(appDecision(rules, c, "com.khan", "education").allowed, false);
  assert.equal(appDecision(rules, c, "com.apple.mobilephone", null, true).allowed, true);
  const t = deviceState(defaultRules(15), { ...c, tampered: true });
  assert.equal(t.mode, "tamper");
});

test("the phone's own clock is never consulted", () => {
  // Same server instant always gives the same answer; a device can only influence `now` via the server.
  const rules = defaultRules(8);
  assert.deepEqual(deviceState(rules, ctx("2026-10-15T01:00:00Z")), deviceState(rules, ctx("2026-10-15T01:00:00Z")));
});

test("web filter: allow list beats block list beats categories, subdomains included", () => {
  const rules = defaultRules(12);
  rules.web.blockDomains = ["example.com"];
  rules.web.allowDomains = ["school.example.com"];
  assert.equal(webDecision(rules, "www.example.com", []).allowed, false);
  assert.equal(webDecision(rules, "school.example.com", []).allowed, true);
  assert.equal(webDecision(rules, "notexample.com", []).allowed, true);
  assert.equal(webDecision(rules, "casino.test", ["gambling"]).allowed, false);
  rules.web.allowListOnly = true;
  assert.equal(webDecision(rules, "random.org", []).allowed, false);
});

test("tamper analysis flags new bypass signals once", () => {
  const base = {
    deviceName: "Ava's iPhone",
    clockSkewSeconds: 3 * 3600,
    familyTimeZone: TZ,
    appliedPolicyVersion: 3,
    currentPolicyVersion: 4,
    policyChangedAt: at("2026-10-14T10:00:00Z"),
    now: at("2026-10-14T11:00:00Z"),
  };
  const f = analyzeHeartbeat({ ...base, signals: { developerOptions: true, vpnActive: true }, previous: {} });
  const kinds = f.map((x) => x.kind).sort();
  assert.deepEqual(kinds, ["clock_changed", "developer_mode", "rules_not_applied", "vpn"]);
  const again = analyzeHeartbeat({ ...base, clockSkewSeconds: 0, appliedPolicyVersion: 4, signals: { developerOptions: true }, previous: { developerOptions: true } });
  assert.deepEqual(again, []);
  assert.equal(isTampered({ developerOptions: true }), true);
  assert.equal(isTampered({ vpnActive: true }), false);
});

test("TOTP matches the RFC 6238 test vector and tolerates one step of drift", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(totpCode(secret, Math.floor(59 / 30)), "287082");
  const now = 1_111_111_109_000;
  assert.equal(verifyTotp(secret, "081804", now), true);
  assert.equal(verifyTotp(secret, totpCode(secret, Math.floor(now / 30_000) + 1), now), true);
  assert.equal(verifyTotp(secret, "000000", now), false);
  assert.equal(verifyTotp(secret, "abc", now), false);
});
