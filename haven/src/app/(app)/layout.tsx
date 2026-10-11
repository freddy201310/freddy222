import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";
import { sweepOfflineDevices } from "@/lib/device";
import { AppNav } from "@/components/AppNav";
import { billingState } from "@/lib/billing";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { family, parent, role } = await requireFamily();
  // Catch phones that went quiet even if the cron job isn't set up.
  await sweepOfflineDevices(new Date(), family.id);
  const [requests, alerts] = await Promise.all([
    db.timeRequest.count({ where: { child: { familyId: family.id }, status: "PENDING" } }),
    db.alert.count({ where: { familyId: family.id, readAt: null, kind: { not: "time_request" } } }),
  ]);
  const billing = billingState(family);
  return (
    <div className="min-h-screen">
      <AppNav familyName={family.name} parentName={parent.name} role={role} requests={requests} alerts={alerts} billing={billing.enabled} />
      {billing.enabled && (billing.needsPayment || (billing.trialDaysLeft <= 7 && !billing.status)) && (
        <div className={`px-4 py-2 text-center text-sm ${billing.needsPayment ? "bg-warn-100 text-warn-700" : "bg-ink-100 text-ink-700"}`}>
          {billing.needsPayment ? "Your free trial has ended. Phones stay protected, but you can't connect new ones." : `${billing.trialDaysLeft} day${billing.trialDaysLeft === 1 ? "" : "s"} left in your free trial.`}{" "}
          <Link href="/billing" className="font-semibold underline">Billing</Link>
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
