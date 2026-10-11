import { NextResponse } from "next/server";
import { deviceFromRequest, handleHeartbeat, HeartbeatSchema } from "@/lib/device";

// Phones check in about once a minute: they report usage and tamper signals, and get back
// the current rules plus what is allowed right now, computed on the server's clock.
export async function POST(req: Request) {
  const device = await deviceFromRequest(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = HeartbeatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", detail: parsed.error.issues[0]?.message }, { status: 400 });
  return NextResponse.json(await handleHeartbeat(device, parsed.data));
}
