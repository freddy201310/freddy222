import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { deviceFromRequest, deviceRateLimit } from "@/lib/device";
import { raiseAlert } from "@/lib/family";
import { ageOf, parseRules } from "@/lib/rules";
import { localParts } from "@/lib/time";

const Body = z.object({
  appId: z.string().min(1).max(200), // "*" for overall screen time
  appName: z.string().trim().min(1).max(80),
  minutes: z.number().int().min(1).max(240),
  reason: z.string().trim().max(200).default(""),
});

// A child asks for more time from their phone. Requests are capped per day and always go to a
// parent; the phone can never grant time to itself.
export async function POST(req: Request) {
  const device = await deviceFromRequest(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limited = await deviceRateLimit(req, "requests", 20, 600, device.id);
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const { child } = device;
  const rules = parseRules(child.policy?.rules, ageOf(child.birthYear));
  if (!rules.requests.enabled) return NextResponse.json({ error: "requests_disabled" }, { status: 403 });
  if (rules.apps.some((a) => a.appId === parsed.data.appId && a.rule === "block")) {
    return NextResponse.json({ error: "app_blocked" }, { status: 403 });
  }
  const { day } = localParts(new Date(), child.family.timeZone);
  const today = await db.timeRequest.count({ where: { childId: child.id, day } });
  if (today >= rules.requests.maxPerDay) return NextResponse.json({ error: "daily_request_limit" }, { status: 429 });
  if (await db.timeRequest.count({ where: { childId: child.id, status: "PENDING" } }) >= 1) {
    return NextResponse.json({ error: "request_already_pending" }, { status: 429 });
  }

  const minutes = Math.min(parsed.data.minutes, rules.requests.maxMinutesPerRequest);
  const request = await db.timeRequest.create({ data: { childId: child.id, deviceId: device.id, day, ...parsed.data, minutes } });
  await raiseAlert({
    familyId: child.familyId,
    childId: child.id,
    deviceId: device.id,
    kind: "time_request",
    severity: "INFO",
    message: `${child.name} asked for ${minutes} more minutes of ${parsed.data.appName}${parsed.data.reason ? `: “${parsed.data.reason}”` : ""}`,
  });
  return NextResponse.json({ requestId: request.id, status: request.status, minutes });
}

/** The phone polls its own requests to show the child the answer. */
export async function GET(req: Request) {
  const device = await deviceFromRequest(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { day } = localParts(new Date(), device.child.family.timeZone);
  const requests = await db.timeRequest.findMany({
    where: { childId: device.childId, day },
    select: { id: true, appId: true, appName: true, minutes: true, grantedMins: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}
