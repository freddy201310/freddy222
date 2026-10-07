import Link from "next/link";
import type { JournalMode } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { JOURNAL_MODES, MODE_BY_ID } from "@/lib/journal";
import { PageHeader } from "@/components/PageHeader";
import { Insights } from "./Insights";

export const metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await requireUser();
  const { mode } = await searchParams;
  const filter = JOURNAL_MODES.some((m) => m.id === mode) ? (mode as JournalMode) : undefined;
  const entries = await db.journalEntry.findMany({
    where: { userId: user.id, ...(filter ? { mode: filter } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader eyebrow="Write it down" title="Journal" subtitle="A quiet place for your thoughts." action={<Link href="/journal/new" className="btn-primary">New entry</Link>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {JOURNAL_MODES.map((m) => (
          <Link key={m.id} href={`/journal/new?mode=${m.id}`} className="rounded-3xl border border-moss-100 bg-white/80 p-4 text-center shadow-soft transition hover:-translate-y-0.5">
            <div className="text-2xl">{m.icon}</div>
            <div className="mt-1 text-sm font-medium">{m.label}</div>
          </Link>
        ))}
      </div>

      <Insights />

      <div className="mb-4 mt-8 flex flex-wrap gap-2">
        <Link href="/journal" className={`chip ${!filter ? "chip-on" : ""}`}>All</Link>
        {JOURNAL_MODES.map((m) => (
          <Link key={m.id} href={`/journal?mode=${m.id}`} className={`chip ${filter === m.id ? "chip-on" : ""}`}>{m.icon} {m.label}</Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="card text-center text-moss-600">No entries yet. Your first page is waiting. ✍️</div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Link href={`/journal/${e.id}`} className="block rounded-3xl border border-moss-100 bg-white/80 p-5 transition hover:border-moss-300">
                <div className="flex items-center justify-between text-xs text-moss-500">
                  <span>{MODE_BY_ID[e.mode].icon} {MODE_BY_ID[e.mode].label}</span>
                  <span>{formatDate(e.createdAt)}</span>
                </div>
                <h3 className="mt-1 font-sans text-lg font-semibold">{e.title || e.prompt || e.content.slice(0, 60)}</h3>
                <p className="mt-1 line-clamp-2 text-moss-700">{e.aiSummary ?? e.content}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
