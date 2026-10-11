import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Privacy & data" };

const SECTIONS: [string, string][] = [
  ["What we store", "Your account (name, email, a securely hashed password), and the things you create: conversations, journal entries, check-ins, your Life Manual, Happy Place settings, Future Me profile, and letters. That's it."],
  ["Where it lives", "In a PostgreSQL database operated by whoever hosts this MindGarden instance. Sessions use a random token stored in a secure, HTTP-only cookie; only a one-way hash of it is kept on the server."],
  ["How the AI uses it", "When you talk with your companion, ask Future Me a question, request a reset, or generate journal insights, the relevant parts of your MindGarden data are sent to our AI provider (Anthropic's Claude API) to produce a reply. It is used to respond to you, not to advertise to you."],
  ["Learning from you", "By default the companion adds things you share (like goals or what helps you) to your Life Manual. You can turn this off in Settings, edit or delete any entry, or wipe the whole manual."],
  ["Your controls", "Export everything as a single JSON file at any time. Delete your account from Settings and all of your data is permanently removed immediately."],
  ["What we never do", "Sell your data, show ads, or use your reflections to target you."],
];

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Logo />
      <h1 className="mt-10 text-4xl font-semibold">Private by design</h1>
      <p className="mt-3 text-moss-700">A plain-language explanation of how MindGarden handles your data.</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map(([h, b]) => (
          <section key={h}>
            <h2 className="text-xl font-semibold">{h}</h2>
            <p className="mt-2 leading-relaxed text-moss-800">{b}</p>
          </section>
        ))}
      </div>
      <Link href="/" className="btn-soft mt-12">Back home</Link>
    </main>
  );
}
