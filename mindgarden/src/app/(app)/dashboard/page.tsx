import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayKey, greeting, relativeDay } from "@/lib/dates";
import { getDaily } from "@/lib/daily";
import { discoverPatterns } from "@/lib/insights";
import { toggleChallenge } from "@/actions/daily";
import { MoodCheckIn } from "@/components/MoodCheckIn";

export const metadata = { title: "Today" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const [daily, todayMood, letters, upcoming, goals, recentConvo, patterns, streak] = await Promise.all([
    getDaily(user.id),
    db.moodLog.findUnique({ where: { userId_day: { userId: user.id, day: dayKey() } } }),
    db.letter.findMany({ where: { userId: user.id, deliveredAt: { not: null }, openedAt: null }, orderBy: { deliverAt: "desc" } }),
    db.letter.findFirst({ where: { userId: user.id, deliveredAt: null }, orderBy: { deliverAt: "asc" } }),
    db.manualEntry.findMany({ where: { userId: user.id, category: "GOAL" }, orderBy: { strength: "desc" }, take: 3 }),
    db.conversation.findFirst({ where: { userId: user.id, mode: "companion" }, orderBy: { updatedAt: "desc" } }),
    discoverPatterns(user.id),
    checkInStreak(user.id),
  ]);
  const first = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 text-4xl font-semibold">{greeting()}, {first}</h1>
          {welcome && <p className="mt-2 text-moss-700">Your garden is planted. 🌱 Here&apos;s your first day.</p>}
        </div>
        {streak > 1 && <div className="rounded-full bg-dawn-100 px-4 py-2 text-sm font-medium text-bark-700">🌞 {streak}-day check-in streak</div>}
      </header>

      {letters.length > 0 && (
        <Link href="/letters" className="block rounded-3xl border border-dawn-200 bg-gradient-to-r from-dawn-50 to-white p-5 shadow-soft transition hover:-translate-y-0.5">
          <p className="text-lg font-semibold">💌 {letters.length === 1 ? "A letter from your past self has arrived" : `${letters.length} letters from your past self have arrived`}</p>
          <p className="text-sm text-moss-600">&ldquo;{letters[0].subject}&rdquo; — tap to open</p>
        </Link>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-moss-600 via-moss-700 to-moss-800 p-8 text-white shadow-soft">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-dawn-300/30 blur-2xl" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-200">Thought of the day</p>
        <blockquote className="mt-3 max-w-3xl font-serif text-2xl leading-snug sm:text-3xl">&ldquo;{daily.thought}&rdquo;</blockquote>
        {daily.thoughtSource && <p className="mt-2 text-sm text-moss-200">— {daily.thoughtSource}</p>}
        <p className="mt-6 max-w-2xl text-moss-50">{daily.encouragement}</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <p className="eyebrow">Reflect</p>
          <h2 className="mt-2 text-xl font-semibold">{daily.question}</h2>
          <Link href={`/journal/new?mode=DAILY_REFLECTION&prompt=${encodeURIComponent(daily.question)}`} className="btn-soft mt-4">Write about it</Link>
        </section>
        <section className="card">
          <p className="eyebrow">Small challenge</p>
          <p className={`mt-2 text-lg ${daily.challengeDone ? "text-moss-500 line-through" : "text-moss-900"}`}>{daily.challenge}</p>
          <form action={toggleChallenge.bind(null, daily.id)}>
            <button className={daily.challengeDone ? "btn-soft mt-4" : "btn-primary mt-4"}>{daily.challengeDone ? "✓ Done — nice work" : "Mark as done"}</button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">{todayMood ? "Today's check-in" : "How are you feeling?"}</h2>
            <Link href="/mood" className="text-sm text-moss-600 underline underline-offset-4">Trends</Link>
          </div>
          <div className="mt-4"><MoodCheckIn initial={todayMood ?? undefined} compact /></div>
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="text-xl font-semibold">Talk it through</h2>
            <p className="mt-1 text-moss-600">{recentConvo ? `Pick up where you left off: “${recentConvo.title}”` : "Your companion is here to listen, reflect, and help you sort your thoughts."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={recentConvo ? `/companion/${recentConvo.id}` : "/companion"} className="btn-primary">{recentConvo ? "Continue" : "Start a conversation"}</Link>
              <Link href="/future-me" className="btn-soft">🌅 What would Future Me say?</Link>
            </div>
          </section>

          <section className="card">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Growing toward</h2>
              <Link href="/manual" className="text-sm text-moss-600 underline underline-offset-4">Life Manual</Link>
            </div>
            {goals.length ? (
              <ul className="mt-3 space-y-2">{goals.map((g) => <li key={g.id} className="flex gap-2"><span>🌱</span>{g.content}</li>)}</ul>
            ) : (
              <p className="mt-2 text-moss-600">Add a goal in your Life Manual to see it here.</p>
            )}
            {upcoming && <p className="mt-4 text-sm text-moss-500">💌 Next letter arrives {relativeDay(upcoming.deliverAt)}.</p>}
          </section>
        </div>
      </div>

      {patterns.length > 0 && (
        <section className="card">
          <h2 className="text-xl font-semibold">Noticing in your garden</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">{patterns.slice(0, 4).map((p) => <li key={p.text} className="rounded-2xl bg-moss-50 p-3 text-sm">🔎 {p.text}</li>)}</ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["/happy-place", "🏝️", "Visit your Happy Place"],
          ["/journal/new", "📓", "Quick journal"],
          ["/letters/new", "💌", "Write to Future Me"],
          ["/reset", "🧭", "I need a reset"],
        ].map(([href, icon, label]) => (
          <Link key={href} href={href} className="rounded-3xl border border-moss-100 bg-white/80 p-5 text-center shadow-soft transition hover:-translate-y-0.5">
            <div className="text-3xl">{icon}</div>
            <div className="mt-2 text-sm font-medium">{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function checkInStreak(userId: string) {
  const logs = await db.moodLog.findMany({ where: { userId }, orderBy: { day: "desc" }, take: 60, select: { day: true } });
  const days = new Set(logs.map((l) => l.day));
  let streak = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not logged yet doesn't break the streak
  while (days.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
