import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FLAWS, PLATFORM_LIMITS } from "@/lib/flaws";

export const metadata = { title: "The flaws we fixed" };

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/signup" className="btn-primary">Get started</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        <h1 className="h1">What's wrong with today's parental controls</h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          We studied bypass guides, parent forums, security write-ups, and reviews of the major parental-control apps. Here is each problem we found and how Haven handles it. Sources are linked so you can check them yourself.
        </p>

        <ol className="mt-8 space-y-3">
          {FLAWS.map((f, i) => (
            <li key={f.flaw} className="grid gap-3 rounded-2xl border border-ink-100 p-5 md:grid-cols-[2rem_1fr_1fr]">
              <span className="text-lg font-bold text-ink-300">{i + 1}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{f.product}</p>
                <p className="mt-1 text-ink-800">{f.flaw}</p>
                {f.source && <a href={f.source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-ink-400 underline">Source: {f.source.label}</a>}
              </div>
              <div className="rounded-xl bg-haven-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-haven-700">Haven</p>
                <p className="mt-1 text-sm text-haven-900">{f.fix}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-12 rounded-2xl bg-ink-50 p-6">
          <h2 className="h2">What no app can fix</h2>
          <p className="hint mt-1">Some limits come from Apple and Google. We'd rather tell you than oversell.</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-700">
            {PLATFORM_LIMITS.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </section>
      </main>
    </div>
  );
}
