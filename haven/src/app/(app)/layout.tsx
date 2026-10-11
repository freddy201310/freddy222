import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";
import { sweepOfflineDevices } from "@/lib/device";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { family, parent, role } = await requireFamily();
  // Catch phones that went quiet even if the cron job isn't set up.
  await sweepOfflineDevices();
  const [requests, alerts] = await Promise.all([
    db.timeRequest.count({ where: { child: { familyId: family.id }, status: "PENDING" } }),
    db.alert.count({ where: { familyId: family.id, readAt: null, kind: { not: "time_request" } } }),
  ]);
  return (
    <div className="min-h-screen">
      <AppNav familyName={family.name} parentName={parent.name} role={role} requests={requests} alerts={alerts} />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
