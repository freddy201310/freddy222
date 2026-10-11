import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";
import { timeAgo } from "@/lib/time";
import { Empty } from "@/components/ui";
import { markAlertsRead } from "@/actions/children";

export const metadata = { title: "Alerts" };

const TONE = { CRITICAL: "border-l-danger-500", WARNING: "border-l-warn-500", INFO: "border-l-ink-300" };

export default async function AlertsPage() {
  const { family } = await requireFamily();
  const alerts = await db.alert.findMany({ where: { familyId: family.id }, include: { child: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = alerts.filter((a) => !a.readAt).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Alerts</h1>
          <p className="hint">Bypass attempts, phones going offline, rules not applied, and “I need help” presses. Every parent sees the same list.</p>
        </div>
        {unread > 0 && (
          <form action={async () => { "use server"; await markAlertsRead(); }}>
            <button className="btn-soft">Mark all read</button>
          </form>
        )}
      </div>
      {alerts.length === 0 ? (
        <Empty title="All quiet">Haven will tell you here the moment something needs attention.</Empty>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className={`card border-l-4 py-4 ${TONE[a.severity]} ${a.readAt ? "opacity-60" : ""}`}>
              <p className={a.severity === "CRITICAL" ? "font-semibold" : ""}>{a.message}</p>
              <p className="mt-1 text-sm text-ink-500">{a.child?.name ?? family.name} · {timeAgo(a.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
