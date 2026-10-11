import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";

// Everything stored about the signed-in parent's family. Secrets and token hashes are left out.
export async function GET() {
  const { family, parent } = await requireFamily();
  const [members, children, alerts, audit] = await Promise.all([
    db.familyMember.findMany({ where: { familyId: family.id }, select: { role: true, createdAt: true, parent: { select: { name: true, email: true } } } }),
    db.child.findMany({
      where: { familyId: family.id },
      include: {
        policy: { select: { version: true, rules: true, updatedAt: true } },
        devices: { select: { name: true, platform: true, model: true, osVersion: true, enrolledAt: true, lastSeenAt: true, revokedAt: true, latitude: true, longitude: true, locationAt: true, battery: true, signals: true, usage: true } },
        requests: true,
      },
    }),
    db.alert.findMany({ where: { familyId: family.id } }),
    db.auditLog.findMany({ where: { familyId: family.id } }),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    you: { name: parent.name, email: parent.email, phone: parent.phone, notifyEmail: parent.notifyEmail, notifySms: parent.notifySms, notifyLevel: parent.notifyLevel, createdAt: parent.createdAt },
    family: { name: family.name, timeZone: family.timeZone, createdAt: family.createdAt },
    members,
    children,
    alerts,
    history: audit,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="haven-export-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store" },
  });
}
