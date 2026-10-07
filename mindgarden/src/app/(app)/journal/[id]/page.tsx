import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { MODE_BY_ID } from "@/lib/journal";
import { deleteJournalEntry } from "@/actions/journal";

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await db.journalEntry.findFirst({ where: { id, userId: user.id } });
  if (!entry) notFound();
  const mode = MODE_BY_ID[entry.mode];

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/journal" className="text-sm text-moss-600">← Journal</Link>
      <p className="eyebrow mt-6">{mode.icon} {mode.label} · {formatDate(entry.createdAt)}</p>
      <h1 className="mt-2 text-3xl font-semibold">{entry.title || entry.prompt || "Untitled entry"}</h1>
      {entry.title && entry.prompt && <p className="mt-2 font-serif text-lg text-moss-600">{entry.prompt}</p>}
      <div className="card mt-6 whitespace-pre-wrap leading-relaxed">{entry.content}</div>
      {entry.aiSummary && (
        <p className="mt-4 rounded-2xl bg-moss-50 p-4 text-sm text-moss-700">🌿 <em>{entry.aiSummary}</em></p>
      )}
      <div className="mt-6 flex gap-2">
        <Link href={`/companion`} className="btn-soft">Talk about this</Link>
        <form action={deleteJournalEntry.bind(null, entry.id)}>
          <button className="btn-ghost text-moss-500">Delete entry</button>
        </form>
      </div>
    </article>
  );
}
