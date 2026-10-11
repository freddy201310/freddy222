import { NextResponse } from "next/server";
import { sweepOfflineDevices } from "@/lib/device";

// Call every few minutes: GET /api/cron/offline with Authorization: Bearer $CRON_SECRET
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ flagged: await sweepOfflineDevices() });
}
