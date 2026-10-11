import Link from "next/link";
import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";
import { timeAgo } from "@/lib/time";
import { ActionForm, CodeField } from "@/components/Form";
import { changePassword, deleteAccount, saveNotifications, signOutEverywhere } from "@/actions/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { parent, session, role } = await requireFamily();
  const sessions = await db.session.findMany({ where: { parentId: parent.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <h1 className="h1">Settings</h1>

      <section className="card">
        <h2 className="h2">How Haven reaches you</h2>
        <p className="hint mt-1">Alerts always appear in the dashboard. These settings add email and text messages. Texts are only sent for urgent alerts like “I need help” or a phone being reset.</p>
        <div className="mt-4 max-w-md">
          <ActionForm action={saveNotifications} submit="Save">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="notifyEmail" defaultChecked={parent.notifyEmail} className="h-4 w-4 accent-haven-600" /> Email me at {parent.email}
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="notifySms" defaultChecked={parent.notifySms} className="h-4 w-4 accent-haven-600" /> Text me urgent alerts
            </label>
            <div>
              <label className="label" htmlFor="phone">Mobile number</label>
              <input id="phone" name="phone" type="tel" defaultValue={parent.phone ?? ""} placeholder="+15551234567" className="input" autoComplete="tel" />
            </div>
            <div>
              <label className="label" htmlFor="notifyLevel">Email me about</label>
              <select id="notifyLevel" name="notifyLevel" defaultValue={parent.notifyLevel} className="input">
                <option value="CRITICAL">Only urgent alerts</option>
                <option value="WARNING">Warnings and urgent alerts</option>
                <option value="INFO">Everything</option>
              </select>
              <p className="hint mt-1">Requests for more time are always emailed, since your child is waiting.</p>
            </div>
          </ActionForm>
        </div>
      </section>

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

      <section className="card space-y-3">
        <h2 className="h2">Your data</h2>
        <p className="hint">Download everything Haven stores about your family as a JSON file.</p>
        <a href="/api/export" className="btn-soft">Download my family's data</a>
        <details className="pt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-danger-700">Delete my account</summary>
          <div className="mt-3 max-w-md">
            <ActionForm action={deleteAccount} submit="Delete my account forever" variant="danger" pendingLabel="Deleting…">
              <p className="hint">
                {role === "OWNER"
                  ? "You own this family, so this also deletes every child, phone, rule, and history entry. Phones stop being protected."
                  : "You'll be removed from this family. The family and its rules stay."}
              </p>
              <div>
                <label className="label" htmlFor="confirm">Type DELETE to confirm</label>
                <input id="confirm" name="confirm" className="input" autoComplete="off" required />
              </div>
              <CodeField />
            </ActionForm>
          </div>
        </details>
      </section>
    </div>
  );
}
