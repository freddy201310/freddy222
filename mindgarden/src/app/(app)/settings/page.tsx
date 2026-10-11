import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForm, PasswordForm, ClearButtons, DeleteAccount } from "./forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [conversations, manual, journal, moods, letters] = await Promise.all([
    db.conversation.count({ where: { userId: user.id } }),
    db.manualEntry.count({ where: { userId: user.id } }),
    db.journalEntry.count({ where: { userId: user.id } }),
    db.moodLog.count({ where: { userId: user.id } }),
    db.letter.count({ where: { userId: user.id } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Your garden, your rules" title="Settings & privacy" />
      <div className="space-y-6">
        <section className="card">
          <h2 className="text-xl font-semibold">Profile & companion</h2>
          <ProfileForm name={user.name} tone={user.companionTone} interests={user.interests} aiMemoryEnabled={user.aiMemoryEnabled} />
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold">Private by design</h2>
          <div className="mt-3 grid gap-4 text-sm text-moss-800 md:grid-cols-2">
            <div className="rounded-2xl bg-moss-50 p-4">
              <p className="font-semibold">What&apos;s stored</p>
              <p className="mt-1">{conversations} conversations · {manual} Life Manual entries · {journal} journal entries · {moods} check-ins · {letters} letters</p>
            </div>
            <div className="rounded-2xl bg-moss-50 p-4">
              <p className="font-semibold">AI processing</p>
              <p className="mt-1">
                {aiEnabled()
                  ? "When you use AI features, relevant parts of your data are sent to Anthropic's Claude API to generate a reply. Never used for ads."
                  : "AI is not configured on this instance, so nothing leaves this server."}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm"><Link href="/privacy" className="underline underline-offset-4">Read the full storage policy</Link></p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold">Your data</h2>
          <p className="mt-1 text-moss-700">Download everything as a single JSON file — conversations, journal, Life Manual, check-ins, letters, and more.</p>
          <a href="/api/export" className="btn-primary mt-4">⬇ Export all my data</a>
          <div className="mt-6 border-t border-moss-100 pt-5">
            <p className="font-medium">Clear specific data</p>
            <p className="text-sm text-moss-600">Permanently removes just that part of your garden.</p>
            <ClearButtons />
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold">Password</h2>
          <PasswordForm />
        </section>

        <section className="card border-dawn-200">
          <h2 className="text-xl font-semibold">Delete account</h2>
          <p className="mt-1 text-moss-700">This immediately and permanently deletes your account and everything in it. Consider exporting first.</p>
          <DeleteAccount />
        </section>
      </div>
    </>
  );
}
