import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/family";
import { deviceRateLimit } from "@/lib/device";
import { newToken, normalizeCode, sha256 } from "@/lib/tokens";

const Body = z.object({
  code: z.string().min(8).max(20),
  platform: z.enum(["IOS", "ANDROID"]),
  name: z.string().trim().min(1).max(60),
  model: z.string().max(60).default(""),
  osVersion: z.string().max(40).default(""),
});

// A parent creates a one-time code on the website; the phone trades it for its own token.
export async function POST(req: Request) {
  const limited = await deviceRateLimit(req, "enroll", 10, 900);
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { code, platform, ...device } = parsed.data;

  const enrollment = await db.enrollmentCode.findUnique({ where: { codeHash: sha256(normalizeCode(code)) }, include: { child: true } });
  if (!enrollment || enrollment.usedAt || enrollment.expiresAt < new Date()) {
    return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 400 });
  }
  if (enrollment.platform !== platform) return NextResponse.json({ error: "wrong_platform" }, { status: 400 });

  // Mark used first; the conditional update makes a code single-use even under concurrent requests.
  const claimed = await db.enrollmentCode.updateMany({ where: { id: enrollment.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 400 });

  const token = newToken();
  const created = await db.device.create({ data: { childId: enrollment.childId, platform, tokenHash: sha256(token), ...device } });
  await audit(enrollment.child.familyId, null, "device.enrolled", `${device.name} (${platform}) for ${enrollment.child.name}`);
  return NextResponse.json({ deviceId: created.id, deviceToken: token, childName: enrollment.child.name });
}
