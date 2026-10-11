import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { formEncode, verifyStripeSignature } from "./stripe";
import { billingState } from "./billing";
import { wantsAlert } from "./severity";
import { checkHost, normalizeHost, parentDomains, parseDomainList, safeSearchRewrites } from "./webfilter";
import { parseDsn } from "./monitoring";
import { defaultRules, RulesSchema } from "./rules";

test("Stripe signatures: valid, tampered, stale, and malformed", () => {
  const secret = "whsec_test";
  const payload = '{"id":"evt_1"}';
  const now = 1_760_000_000_000;
  const t = Math.floor(now / 1000);
  const sig = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=${sig}`, secret, 300, now), true);
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=bad,v1=${sig}`, secret, 300, now), true, "any matching v1 is accepted");
  assert.equal(verifyStripeSignature(payload + " ", `t=${t},v1=${sig}`, secret, 300, now), false, "tampered body");
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=${sig}`, "other", 300, now), false, "wrong secret");
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=${sig}`, secret, 300, now + 10 * 60_000), false, "replayed later");
  assert.equal(verifyStripeSignature(payload, null, secret), false);
  assert.equal(verifyStripeSignature(payload, "garbage", secret), false);
});

test("Stripe form encoding handles nested objects and arrays", () => {
  const enc = formEncode({ mode: "subscription", line_items: [{ price: "price_1", quantity: 1 }], subscription_data: { metadata: { familyId: "f 1" } }, skip: undefined });
  assert.deepEqual(enc, [
    "mode=subscription",
    "line_items%5B0%5D%5Bprice%5D=price_1",
    "line_items%5B0%5D%5Bquantity%5D=1",
    "subscription_data%5Bmetadata%5D%5BfamilyId%5D=f%201",
  ]);
});

test("billing: off without Stripe; trial and lapsed states with it", () => {
  const now = new Date("2026-10-11T00:00:00Z");
  const soon = new Date("2026-10-20T00:00:00Z");
  const past = new Date("2026-10-01T00:00:00Z");
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal(billingState({ trialEndsAt: past, subscriptionStatus: null }, now).needsPayment, false);
  process.env.STRIPE_SECRET_KEY = "sk_test";
  process.env.STRIPE_PRICE_ID = "price_1";
  assert.deepEqual(billingState({ trialEndsAt: soon, subscriptionStatus: null }, now).trialDaysLeft, 9);
  assert.equal(billingState({ trialEndsAt: past, subscriptionStatus: null }, now).needsPayment, true);
  assert.equal(billingState({ trialEndsAt: past, subscriptionStatus: "active" }, now).needsPayment, false);
  assert.equal(billingState({ trialEndsAt: past, subscriptionStatus: "past_due" }, now).needsPayment, true);
  delete process.env.STRIPE_SECRET_KEY;
});

test("alert thresholds", () => {
  assert.equal(wantsAlert("WARNING", "CRITICAL"), true);
  assert.equal(wantsAlert("WARNING", "WARNING"), true);
  assert.equal(wantsAlert("WARNING", "INFO"), false);
  assert.equal(wantsAlert("CRITICAL", "WARNING"), false);
  assert.equal(wantsAlert("INFO", "INFO"), true);
});

test("web filter helpers", () => {
  assert.deepEqual(parentDomains("https://a.b.Example.com./path"), ["a.b.example.com", "b.example.com", "example.com"]);
  assert.deepEqual(parentDomains("www.example.co.uk"), ["example.co.uk", "co.uk"]);
  assert.deepEqual(parentDomains("localhost"), []);
  assert.equal(normalizeHost("HTTP://WWW.Test.com:8080/x?y"), "test.com");
  assert.deepEqual(parseDomainList("# c\n0.0.0.0 bad.com\nwww.good.com # note\n\nnot a domain\n127.0.0.1 x.y.net"), ["bad.com", "good.com", "x.y.net"]);

  const rules = defaultRules(12);
  assert.equal(checkHost(rules, "m.pokerstars.com", ["gambling"]).allowed, false);
  assert.equal(checkHost(rules, "khanacademy.org", []).allowed, true);
  const rw = safeSearchRewrites(rules);
  assert.equal(rw["www.google.com"], "forcesafesearch.google.com");
  assert.equal(rw["www.youtube.com"], "restrict.youtube.com");
  rules.web.safeSearch = false;
  rules.web.youtubeRestricted = false;
  assert.deepEqual(safeSearchRewrites(rules), {});
});

test("Sentry DSN parsing", () => {
  assert.deepEqual(parseDsn("https://abc123@o42.ingest.sentry.io/7"), { endpoint: "https://o42.ingest.sentry.io/api/7/envelope/", key: "abc123" });
  assert.equal(parseDsn(undefined), null);
  assert.equal(parseDsn("not a url"), null);
});

test("rules saved before location existed still parse, with location on", () => {
  const old = JSON.parse(JSON.stringify(defaultRules(9)));
  delete old.location;
  assert.deepEqual(RulesSchema.parse(old).location, { enabled: true });
});
