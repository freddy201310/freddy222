import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FLAWS } from "@/lib/flaws";

const FEATURES = [
  { title: "Parents only", body: "No child logins. Parents sign in with a password plus an authenticator code, so a watched-over-the-shoulder password isn't enough." },
  { title: "iPhone and Samsung together", body: "One set of rules, one daily limit shared across every phone, whether your kids have iPhones, Samsungs, or both." },
  { title: "Can't be beaten with the clock", body: "Bedtime and limits run on Haven's clock in your home time zone. Changing the phone's time does nothing." },
  { title: "Bypass alarms", body: "Turned-off permissions, developer mode, VPNs, guest users, resets, and silent phones all raise an alert and can lock the phone." },
  { title: "Fair extra time", body: "Kids can ask for more. You approve it for exactly one app, with a daily cap — no endless “one more minute”." },
  { title: "Real co-parenting", body: "Each parent has their own account and role, with a permanent history of who changed what." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/why" className="btn-ghost">What we fixed</Link>
          <Link href="/login" className="btn-soft">Sign in</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <p className="pill bg-haven-50 text-haven-700">For iPhone and Samsung</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Parental controls without the loopholes.</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-600">
          We went through the bypass tricks and complaints for Screen Time, Family Link, Qustodio, Bark, Norton, and Net Nanny, then built one parent-only dashboard designed around every one of them.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Create a parent account</Link>
          <Link href="/why" className="btn-soft px-6 py-3 text-base">See the {FLAWS.length} flaws we fixed</Link>
        </div>
      </section>

      <section className="bg-ink-50 py-16">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h2 className="h2">{f.title}</h2>
              <p className="mt-2 text-ink-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">A few of the loopholes we closed</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FLAWS.slice(0, 3).map((f) => (
            <div key={f.flaw} className="rounded-2xl border border-ink-100 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{f.product}</p>
              <p className="mt-2 text-sm text-danger-700">{f.flaw}</p>
              <p className="mt-3 text-sm font-medium text-haven-800">{f.fix}</p>
            </div>
          ))}
        </div>
        <Link href="/why" className="btn-ghost mt-4">Read all of them →</Link>
      </section>

      <footer className="border-t border-ink-100 py-8 text-center text-sm text-ink-400">Haven · Built for parents. Kids never get a login.</footer>
    </div>
  );
}
