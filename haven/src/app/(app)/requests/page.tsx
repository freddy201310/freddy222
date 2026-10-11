import { db } from "@/lib/db";
import { canEdit, requireFamily } from "@/lib/family";
import { timeAgo } from "@/lib/time";
import { Avatar, Empty } from "@/components/ui";
import { decideRequest } from "@/actions/children";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const { family, role } = await requireFamily();
  const editor = canEdit(role);
  const [pending, recent] = await Promise.all([
    db.timeRequest.findMany({ where: { child: { familyId: family.id }, status: "PENDING" }, include: { child: true, device: true }, orderBy: { createdAt: "asc" } }),
    db.timeRequest.findMany({ where: { child: { familyId: family.id }, status: { not: "PENDING" } }, include: { child: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const deciders = new Map((await db.parent.findMany({ where: { id: { in: recent.map((r) => r.decidedById).filter((x): x is string => !!x) } } })).map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Requests</h1>
        <p className="hint">Approved time unlocks only the app it was asked for, and only for today.</p>
      </div>
      {pending.length === 0 ? (
        <Empty title="Nothing waiting">When your child asks for more time, it shows up here for every parent.</Empty>
      ) : (
        <ul className="space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center gap-4">
              <Avatar name={r.child.name} color={r.child.color} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.child.name} wants {r.minutes} more minutes of {r.appName}</p>
                <p className="text-sm text-ink-500">{r.reason ? `“${r.reason}” · ` : ""}{r.device?.name ?? "phone"} · {timeAgo(r.createdAt)}</p>
              </div>
              {editor && (
                <form action={decideRequest.bind(null, r.id)} className="flex flex-wrap items-center gap-2">
                  <select name="minutes" defaultValue={r.minutes} className="input w-auto py-2" aria-label="Minutes to give">
                    {[...new Set([5, 10, 15, 30, 60, r.minutes])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                  <button name="decision" value="approve" className="btn-primary">Approve</button>
                  <button name="decision" value="deny" className="btn-soft">Deny</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {recent.length > 0 && (
        <section className="card">
          <h2 className="h2">Recent decisions</h2>
          <ul className="mt-3 divide-y divide-ink-100 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{r.child.name} · {r.appName} · {r.status === "APPROVED" ? `+${r.grantedMins} min` : r.status.toLowerCase()}</span>
                <span className="text-ink-500">{r.decidedById ? deciders.get(r.decidedById) : ""} · {timeAgo(r.decidedAt ?? r.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
