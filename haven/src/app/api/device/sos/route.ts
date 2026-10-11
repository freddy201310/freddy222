import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { deviceFromRequest, deviceRateLimit } from "@/lib/device";
import { raiseAlert } from "@/lib/family";

const Body = z.object({ latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() });

// "I need help" button. Works even while the phone is locked by downtime or a tamper lock.
export async function POST(req: Request) {
  const device = await deviceFromRequest(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limited = await deviceRateLimit(req, "sos", 5, 60, device.id);
  if (limited) return limited;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  const loc =
    body.success && body.data.latitude !== undefined && body.data.longitude !== undefined ? { latitude: body.data.latitude, longitude: body.data.longitude } : null;
  const now = new Date();
  if (loc) await db.device.update({ where: { id: device.id }, data: { latitude: loc.latitude, longitude: loc.longitude, locationAt: now } });
  await raiseAlert({
    familyId: device.child.familyId,
    childId: device.childId,
    deviceId: device.id,
    kind: "sos",
    severity: "CRITICAL",
    message: `${device.child.name} pressed “I need help” on ${device.name}${loc ? ` at ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}` : ""}.`,
  });
  return NextResponse.json({ ok: true });
}
