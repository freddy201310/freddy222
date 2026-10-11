import { deliverDueLetters } from "@/lib/letters";

/**
 * Schedule this (e.g. hourly) with your host's cron: GET /api/cron/deliver-letters
 * with header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const delivered = await deliverDueLetters();
  return Response.json({ delivered });
}
