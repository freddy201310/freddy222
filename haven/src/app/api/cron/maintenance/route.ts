import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { runMaintenance } from "@/lib/maintenance";

// Run every 5 minutes (see .github/workflows/haven-cron.yml): GET with Authorization: Bearer $CRON_SECRET
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runMaintenance());
}
