import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";

export const metadata = { title: "History" };

export default async function ActivityPage() {
  const { family } = await requireFamily();
  const entries = await db.auditLog.findMany({ where: { familyId: family.id }, include: { parent: true }, orderBy: { createdAt: "desc" }, take: 200 });
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: family.timeZone, dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">History</h1>
        <p className="hint">Every change any parent makes, and every phone that connects. It can't be edited or deleted, so co-parents always know who changed what.</p>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 text-ink-500">
            <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">What</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-500">{fmt.format(e.createdAt)}</td>
                <td className="px-4 py-2.5">{e.parent?.name ?? "Phone"}</td>
                <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-500">{e.action}</span> {e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
