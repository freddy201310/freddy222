import Link from "next/link";
import { db } from "@/lib/db";
import { canEdit, requireFamily } from "@/lib/family";
import { ageOf, parseRules } from "@/lib/rules";
import { childSnapshot } from "@/lib/snapshot";
import { formatMinutes, timeAgo } from "@/lib/time";
import { Avatar, deviceHealth, Empty, HealthDot, ModePill, PlatformLabel } from "@/components/ui";
import { grantTime, setPaused } from "@/actions/children";

export const metadata = { title: "Overview" };

export default async function Dashboard() {
  const { family, role } = await requireFamily();
  const editor = canEdit(role);
  const [children, alerts, pending] = await Promise.all([
    db.child.findMany({ where: { familyId: family.id }, include: { policy: true, devices: { where: { revokedAt: null } } }, orderBy: { createdAt: "asc" } }),
    db.alert.findMany({ where: { familyId: family.id, readAt: null, kind: { not: "time_request" } }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.timeRequest.count({ where: { child: { familyId: family.id }, status: "PENDING" } }),
  ]);

  const cards = await Promise.all(
    children.map(async (c) => {
      const rules = parseRules(c.policy?.rules, ageOf(c.birthYear));
      return { child: c, rules, snap: await childSnapshot({ ...c, rules }, family.timeZone) };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Overview</h1>
          <p className="hint">Times shown in {family.timeZone.replace(/_/g, " ")}, the clock every rule follows.</p>
        </div>
        {editor && <Link href="/children/new" className="btn-primary">Add a child</Link>}
      </div>

      {(pending > 0 || alerts.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending > 0 && (
            <Link href="/requests" className="card flex items-center justify-between border-haven-200 bg-haven-50 hover:bg-haven-100">
              <span className="font-semibold text-haven-800">{pending} request{pending > 1 ? "s" : ""} for more time</span>
              <span aria-hidden>→</span>
            </Link>
          )}
          {alerts.length > 0 && (
            <Link href="/alerts" className="card space-y-1 border-warn-100 bg-warn-50 hover:bg-warn-100">
              {alerts.map((a) => (
                <p key={a.id} className={`text-sm ${a.severity === "CRITICAL" ? "font-semibold text-danger-700" : "text-warn-700"}`}>{a.message}</p>
              ))}
            </Link>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <Empty title="No children yet">Add a child, then connect their iPhone or Samsung phone.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(({ child, rules, snap }) => {
            const limit = snap.state.dailyLimit;
            const pct = limit ? Math.min(100, Math.round((snap.usage.total / limit) * 100)) : 0;
            return (
              <section key={child.id} className="card space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={child.name} color={child.color} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/children/${child.id}`} className="font-bold hover:underline">{child.name}</Link>
                    <p className="text-sm text-ink-500">Age {ageOf(child.birthYear)} · {snap.state.reason}</p>
                  </div>
                  <ModePill mode={snap.state.mode} reason={snap.state.reason} />
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{formatMinutes(snap.usage.total)} today</span>
                    <span className="text-ink-500">{limit === null ? "No daily limit" : `${formatMinutes(snap.state.remaining ?? 0)} left of ${formatMinutes(limit)}`}</span>
                  </div>
                  {limit !== null && (
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className={`h-full ${pct >= 100 ? "bg-warn-500" : "bg-haven-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>

                <ul className="space-y-1.5 text-sm">
                  {child.devices.length === 0 && <li className="text-ink-500">No phones connected yet.</li>}
                  {child.devices.map((d) => {
                    const h = deviceHealth(d, child.policy?.version ?? 0);
                    return (
                      <li key={d.id} className="flex items-center gap-2">
                        <HealthDot tone={h.tone} />
                        <span className="font-medium">{d.name}</span>
                        <span className="text-ink-400"><PlatformLabel platform={d.platform} /></span>
                        <span className="ml-auto text-ink-500">{h.label}</span>
                      </li>
                    );
                  })}
                  {child.devices.some((d) => d.locationAt) && (
                    <li className="text-ink-500">
                      Location updated {timeAgo(child.devices.map((d) => d.locationAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0])}
                    </li>
                  )}
                </ul>

                {editor && (
                  <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                    <form action={setPaused.bind(null, child.id, !rules.paused)}>
                      <button className={rules.paused ? "btn-primary" : "btn-soft"}>{rules.paused ? "Resume" : "Pause now"}</button>
                    </form>
                    <form action={grantTime.bind(null, child.id)}>
                      <input type="hidden" name="minutes" value="15" />
                      <button className="btn-soft">+15 min</button>
                    </form>
                    <Link href={`/children/${child.id}`} className="btn-ghost ml-auto">Manage →</Link>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
