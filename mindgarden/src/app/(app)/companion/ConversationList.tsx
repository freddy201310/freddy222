import Link from "next/link";
import { db } from "@/lib/db";
import { relativeDay } from "@/lib/dates";

export async function ConversationList({ userId, activeId }: { userId: string; activeId?: string }) {
  const convos = await db.conversation.findMany({ where: { userId, mode: "companion" }, orderBy: { updatedAt: "desc" }, take: 30 });
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <Link href="/companion" className="btn-soft w-full">+ New conversation</Link>
      <ul className="mt-4 space-y-1">
        {convos.map((c) => (
          <li key={c.id}>
            <Link
              href={`/companion/${c.id}`}
              className={`block rounded-2xl px-3 py-2 text-sm transition ${c.id === activeId ? "bg-white shadow-sm" : "hover:bg-white/60"}`}
            >
              <span className="line-clamp-1 font-medium text-moss-800">{c.title}</span>
              <span className="text-xs text-moss-500">{relativeDay(c.updatedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
