import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Scenery } from "@/components/Scenery";

const FEATURES = [
  { icon: "🌿", title: "A companion that remembers", body: "Reflective conversations that recall your goals, your wins, and what actually helps you — and get better every time you rate a reply." },
  { icon: "📖", title: "Your Personal Life Manual", body: "A living profile of your values, motivators, stressors, and habits. Over time it reveals what lifts your mood, sharpens your focus, and trips you up." },
  { icon: "🏝️", title: "My Happy Place", body: "Design a peaceful sanctuary — a beach, a forest, a cabin, somewhere magical — with your own sounds, weather, colors, and companion pet." },
  { icon: "🌅", title: "Future Me", body: "Describe who you want to become, then ask: “What would Future Me tell me right now?” Answers grounded in your real goals and values." },
  { icon: "💌", title: "Letters to Future Me", body: "Write to yourself, your goals, or your milestones — delivered back to you in a month, a year, or whenever you choose." },
  { icon: "🧭", title: "I Need A Reset", body: "Feeling stuck or overwhelmed? Get a short, personal plan — a breath, a prompt, a walk — that leads to one good next step." },
];

const PILLARS = [
  ["Daily encouragement", "A thought, a question, and a small challenge, shaped by your interests and goals."],
  ["Journal", "Brain dumps, gratitude, reflections, and goal tracking — with gentle insight into your patterns."],
  ["Mood & energy", "Track mood, energy, stress, focus, and sleep. See your trends at a glance."],
];

export default async function Landing() {
  const user = await getUser();
  if (user) redirect(user.onboarded ? "/dashboard" : "/onboarding");

  return (
    <main className="overflow-hidden">
      <section className="relative min-h-[92vh]">
        <Scenery className="absolute inset-0 h-full w-full" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="btn-primary">Start growing</Link>
          </nav>
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pb-40 pt-16 text-center sm:pt-24">
          <p className="eyebrow">Personal growth · Reflection · Calm</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] text-moss-900 sm:text-6xl">
            The AI that learns <em className="text-moss-600">how to help you.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-moss-800/80">
            MindGarden is a companion that helps you better understand yourself and become the person you want to be — one small, positive step at a time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-sunrise px-7 py-3 text-base">Plant your garden</Link>
            <a href="#features" className="btn-soft px-7 py-3 text-base">See how it works</a>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">What grows here</p>
          <h2 className="mt-3 text-4xl font-semibold">A system that gets to know you</h2>
          <p className="mt-4 text-moss-700">
            Most apps forget you the moment you close them. MindGarden remembers what matters to you, notices what helps, and quietly adapts.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card transition hover:-translate-y-1">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-moss-700">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {PILLARS.map(([t, b]) => (
            <div key={t} className="rounded-3xl bg-moss-50 p-6">
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-moss-700">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-b from-cream to-moss-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="eyebrow">Private by design</p>
            <h2 className="mt-3 text-4xl font-semibold">Your garden belongs to you</h2>
            <ul className="mt-6 space-y-3 text-moss-800">
              {[
                "You own your data — export all of it anytime as a single file.",
                "Choose whether the companion learns from your conversations.",
                "Delete your account and everything in it with one action.",
                "No ads. Your reflections are never sold or used to target you.",
              ].map((t) => (
                <li key={t} className="flex gap-3"><span className="text-moss-500">✓</span>{t}</li>
              ))}
            </ul>
            <Link href="/privacy" className="mt-6 inline-block text-sm font-medium text-moss-600 underline underline-offset-4">Read how we store your data</Link>
          </div>
          <div className="card">
            <p className="font-serif text-2xl leading-snug text-moss-800">
              &ldquo;You mentioned that morning walks clear your head. Want to start there today, before the big presentation?&rdquo;
            </p>
            <p className="mt-4 text-sm text-moss-500">— Your MindGarden companion, remembering what works for you</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {["💚 Loved it", "👍 Helpful", "🤔 Not helpful", "🙅 Doesn't fit me"].map((r) => (
                <span key={r} className="chip">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-4xl font-semibold">Small steps. Real growth.</h2>
        <p className="mt-4 text-moss-700">Start with a two-minute setup. Your companion takes it from there.</p>
        <Link href="/signup" className="btn-sunrise mt-8 px-8 py-3 text-base">Create your MindGarden</Link>
      </section>

      <footer className="border-t border-moss-100 py-10 text-center text-sm text-moss-600">
        <p>
          MindGarden is a personal growth and reflection tool. It is not therapy, medical care, or a crisis service.
          If you are in crisis, contact local emergency services or a crisis line (988 in the US, or see findahelpline.com).
        </p>
        <p className="mt-3 space-x-4">
          <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
          <span>© {new Date().getFullYear()} MindGarden</span>
        </p>
      </footer>
    </main>
  );
}
