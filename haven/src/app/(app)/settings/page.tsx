import Link from "next/link";
import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";
import { timeAgo } from "@/lib/time";
import { ActionForm, CodeField } from "@/components/Form";
import { changePassword, signOutEverywhere } from "@/actions/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { parent, session } = await requireFamily();
  const sessions = await db.session.findMany({ where: { parentId: parent.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <h1 className="h1">Settings</h1>

      <section className="card space-y-3">
        <h2 className="h2">Two-step sign-in</h2>
        <p className="text-sm">On. {parent.recoveryCodes.length} recovery code{parent.recoveryCodes.length === 1 ? "" : "s"} left.</p>
        <Link href="/setup-2fa" className="btn-soft">Move to a new phone / new recovery codes</Link>
      </section>

      <section className="card">
        <h2 className="h2">Change password</h2>
        <div className="mt-3 max-w-md">
          <ActionForm action={changePassword} submit="Change password">
            <div>
              <label className="label" htmlFor="current">Current password</label>
              <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
            </div>
            <div>
              <label className="label" htmlFor="password">New password</label>
              <input id="password" name="password" type="password" className="input" minLength={10} autoComplete="new-password" required />
            </div>
            <CodeField />
          </ActionForm>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Where you're signed in</h2>
        <ul className="divide-y divide-ink-100 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex justify-between gap-3 py-2">
              <span className="truncate">{s.userAgent || "Unknown browser"}</span>
              <span className="shrink-0 text-ink-500">{s.id === session.id ? "This browser" : timeAgo(s.createdAt)}</span>
            </li>
          ))}
        </ul>
        <form action={signOutEverywhere}><button className="btn-soft">Sign out everywhere</button></form>
        <p className="hint">If you think your child saw your password, change it here — they still can't get in without your authenticator code.</p>
      </section>
    </div>
  );
}
