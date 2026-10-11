import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceFromRequest, deviceRateLimit } from "@/lib/device";
import { ageOf, parseRules } from "@/lib/rules";
import { checkHost, parentDomains } from "@/lib/webfilter";

// GET /api/device/web-check?host=example.com
// The phone's filter asks about a domain it hasn't seen recently and caches the answer for `ttl`
// seconds. Nothing about the lookup is stored.
export async function GET(req: Request) {
  const device = await deviceFromRequest(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limited = await deviceRateLimit(req, "webcheck", 600, 60, device.id);
  if (limited) return limited;
  const host = new URL(req.url).searchParams.get("host") ?? "";
  const candidates = parentDomains(host);
  if (candidates.length === 0) return NextResponse.json({ error: "invalid_host" }, { status: 400 });

  const rules = parseRules(device.child.policy?.rules, ageOf(device.child.birthYear));
  const rows = await db.domainCategory.findMany({ where: { domain: { in: candidates } }, select: { category: true } });
  const categories = [...new Set(rows.map((r) => r.category))];
  const decision = checkHost(rules, host, categories);
  return NextResponse.json({ host: candidates[0], categories, ...decision, ttl: 6 * 3600, policyVersion: device.child.policy?.version ?? 0 });
}
