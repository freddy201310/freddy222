import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

const Body = z.object({ rating: z.enum(["HELPFUL", "NOT_HELPFUL", "LOVED_IT", "DOESNT_FIT"]).nullable() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const res = await db.message.updateMany({
    where: { id, role: "assistant", conversation: { userId: user.id } },
    data: { rating: parsed.data.rating },
  });
  return Response.json({ ok: res.count === 1 });
}
