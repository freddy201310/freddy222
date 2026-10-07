import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, relativeDay } from "@/lib/dates";
import { deleteLetter } from "@/actions/letters";
import { PageHeader } from "@/components/PageHeader";
import { DeliveredLetter } from "./DeliveredLetter";

export const metadata = { title: "Letters to Future Me" };

const RECIPIENT = { self: "To my future self", goal: "To my future goals", milestone: "For a milestone" } as Record<string, string>;

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const user = await requireUser();
  const { sent } = await searchParams;
  const letters = await db.letter.findMany({ where: { userId: user.id }, orderBy: { deliverAt: "asc" } });
  const delivered = letters.filter((l) => l.deliveredAt).reverse();
  const sealed = letters.filter((l) => !l.deliveredAt);

  return (
    <>
      <PageHeader
        eyebrow="Across time"
        title="Letters to Future Me"
        subtitle="Write to the person you'll be. We'll keep your letter sealed and deliver it on the day you choose."
        action={<Link href="/letters/new" className="btn-sunrise">✉️ Write a letter</Link>}
      />
      {sent && <p className="mb-6 rounded-2xl bg-moss-50 p-4 text-moss-800">💌 Sealed and on its way through time.</p>}

      <section>
        <h2 className="text-xl font-semibold">Arrived</h2>
        {delivered.length === 0 ? (
          <p className="mt-2 text-moss-600">No letters have arrived yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {delivered.map((l) => (
              <DeliveredLetter
                key={l.id}
                id={l.id}
                subject={l.subject}
                body={l.body}
                to={RECIPIENT[l.recipient]}
                written={formatDate(l.createdAt)}
                arrived={formatDate(l.deliverAt)}
                opened={Boolean(l.openedAt)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Sealed & traveling</h2>
        {sealed.length === 0 ? (
          <p className="mt-2 text-moss-600">Nothing in transit. <Link href="/letters/new" className="underline">Write one?</Link></p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {sealed.map((l) => (
              <li key={l.id} className="relative overflow-hidden rounded-3xl border border-dawn-200 bg-gradient-to-br from-dawn-50 to-white p-5 shadow-soft">
                <div className="absolute -right-4 -top-4 text-7xl opacity-10" aria-hidden>✉️</div>
                <p className="text-xs uppercase tracking-widest text-dawn-500">{RECIPIENT[l.recipient]}</p>
                <p className="mt-1 font-serif text-xl text-moss-900">{l.subject}</p>
                <p className="mt-2 text-sm text-moss-600">Arrives {formatDate(l.deliverAt)} ({relativeDay(l.deliverAt)})</p>
                <form action={deleteLetter.bind(null, l.id)} className="mt-3">
                  <button className="text-xs text-moss-400 hover:text-bark-700">Unsend</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
