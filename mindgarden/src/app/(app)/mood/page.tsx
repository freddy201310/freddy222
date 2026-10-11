import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { METRICS } from "@/lib/mood";
import { discoverPatterns } from "@/lib/insights";
import { PageHeader } from "@/components/PageHeader";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { TrendChart } from "@/components/TrendChart";

export const metadata = { title: "Mood & Energy" };

export default async function MoodPage({ searchParams }: { searchParams: Promise<{ range?: string; view?: string }> }) {
  const user = await requireUser();
  const { range = "30", view } = await searchParams;
  const days = [7, 30, 90].includes(Number(range)) ? Number(range) : 30;
  const since = new Date();
  since.setDate(since.getDate() - days + 1);

  const [logs, today, patterns] = await Promise.all([
    db.moodLog.findMany({ where: { userId: user.id, day: { gte: dayKey(since) } }, orderBy: { day: "asc" } }),
    db.moodLog.findUnique({ where: { userId_day: { userId: user.id, day: dayKey() } } }),
    discoverPatterns(user.id),
  ]);

  return (
    <>
      <PageHeader eyebrow="Notice your rhythms" title="Mood & Energy" subtitle="A quick daily check-in. Over time, your trends reveal what helps you feel your best." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="card h-fit">
          <h2 className="text-xl font-semibold">{today ? "Today's check-in" : "How are you today?"}</h2>
          <p className="mb-4 text-sm text-moss-600">Takes about 20 seconds.</p>
          <MoodCheckIn initial={today ?? undefined} />
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[7, 30, 90].map((d) => (
              <a key={d} href={`?range=${d}${view ? `&view=${view}` : ""}`} className={`chip ${d === days ? "chip-on" : ""}`}>{d} days</a>
            ))}
            <a href={`?range=${days}${view === "table" ? "" : "&view=table"}`} className="chip ml-auto">
              {view === "table" ? "Show charts" : "Show table"}
            </a>
          </div>

          {logs.length === 0 ? (
            <div className="card text-center text-moss-600">Your trends will bloom here after your first few check-ins. 🌱</div>
          ) : view === "table" ? (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-moss-50 text-left text-moss-700">
                  <tr>
                    <th className="px-4 py-2">Day</th>
                    {METRICS.map((m) => <th key={m.key} className="px-3 py-2">{m.label}</th>)}
                    <th className="px-4 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {[...logs].reverse().map((l) => (
                    <tr key={l.id} className="border-t border-moss-100">
                      <td className="whitespace-nowrap px-4 py-2">{l.day}</td>
                      {METRICS.map((m) => <td key={m.key} className="px-3 py-2 tabular-nums">{l[m.key]}</td>)}
                      <td className="max-w-xs truncate px-4 py-2 text-moss-600">{l.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {METRICS.map((m) => (
                <TrendChart key={m.key} title={m.label} invert={m.key === "stress"} points={logs.map((l) => ({ day: l.day, value: l[m.key] }))} />
              ))}
            </div>
          )}

          {patterns.length > 0 && (
            <div className="card mt-6">
              <h2 className="text-lg font-semibold">What your data is showing</h2>
              <ul className="mt-3 space-y-2 text-moss-800">
                {patterns.map((p) => <li key={p.text} className="flex gap-2"><span>🔎</span>{p.text}</li>)}
              </ul>
              <p className="mt-3 text-xs text-moss-500">Simple observations from your own check-ins — not conclusions. You know yourself best.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
