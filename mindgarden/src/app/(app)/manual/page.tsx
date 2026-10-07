import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MANUAL_SECTIONS } from "@/lib/manual";
import { discoverPatterns } from "@/lib/insights";
import { addManualEntry } from "@/actions/manual";
import { PageHeader } from "@/components/PageHeader";
import { ManualEntryItem } from "./ManualEntryItem";

export const metadata = { title: "Personal Life Manual" };

export default async function ManualPage() {
  const user = await requireUser();
  const [entries, patterns, loved, rated] = await Promise.all([
    db.manualEntry.findMany({ where: { userId: user.id }, orderBy: [{ strength: "desc" }, { createdAt: "asc" }] }),
    discoverPatterns(user.id),
    db.message.findMany({ where: { conversation: { userId: user.id }, rating: { in: ["LOVED_IT", "HELPFUL"] } }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.message.count({ where: { conversation: { userId: user.id }, rating: { not: null } } }),
  ]);
  const learned = entries.filter((e) => e.source !== "user").length;

  return (
    <>
      <PageHeader
        eyebrow="Living profile"
        title={`${user.name.split(" ")[0]}'s Life Manual`}
        subtitle="Everything MindGarden understands about what helps you. It grows as you talk, journal, and check in — and you can edit anything."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Things in your manual" value={entries.length} />
        <Stat label="Learned from your activity" value={learned} />
        <Stat label="Replies you've rated" value={rated} hint="Ratings teach your companion your style" />
      </div>

      {(patterns.length > 0 || loved.length > 0) && (
        <section className="card mb-6 bg-gradient-to-br from-white to-sky-50">
          <h2 className="text-xl font-semibold">What we&apos;re discovering</h2>
          {patterns.length > 0 && (
            <ul className="mt-3 space-y-2">{patterns.map((p) => <li key={p.text} className="flex gap-2"><span>🔎</span>{p.text}</li>)}</ul>
          )}
          {loved.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-moss-700">Replies that resonated with you</p>
              <ul className="mt-2 space-y-2">
                {loved.map((m) => (
                  <li key={m.id} className="rounded-2xl bg-white/80 p-3 text-sm text-moss-800">
                    {m.rating === "LOVED_IT" ? "💚" : "👍"} {m.content.length > 200 ? m.content.slice(0, 200) + "…" : m.content}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {!user.aiMemoryEnabled && (
        <p className="mb-6 rounded-2xl bg-sky-50 p-3 text-sm text-sky-500">Conversation learning is off — your companion won&apos;t add new entries automatically. You can turn it on in Settings.</p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {MANUAL_SECTIONS.map((s) => {
          const items = entries.filter((e) => e.category === s.category);
          return (
            <section key={s.category} className="card">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><span>{s.icon}</span>{s.title}</h2>
              <p className="text-sm text-moss-500">{s.blurb}</p>
              <ul className="mt-3 space-y-0.5">
                {items.map((e) => <ManualEntryItem key={e.id} id={e.id} content={e.content} source={e.source} strength={e.strength} />)}
                {items.length === 0 && <li className="px-2 py-1.5 text-sm italic text-moss-400">Nothing here yet.</li>}
              </ul>
              <form action={addManualEntry} className="mt-3 flex gap-2">
                <input type="hidden" name="category" value={s.category} />
                <input name="content" className="input py-1.5 text-sm" placeholder="Add…" aria-label={`Add to ${s.title}`} maxLength={280} required />
                <button className="btn-soft px-3 py-1.5 text-sm">Add</button>
              </form>
            </section>
          );
        })}
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-3xl bg-white/80 p-5 shadow-soft">
      <div className="font-serif text-4xl font-semibold text-moss-700">{value}</div>
      <div className="text-sm text-moss-700">{label}</div>
      {hint && <div className="text-xs text-moss-400">{hint}</div>}
    </div>
  );
}
