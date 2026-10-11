import { db } from "@/lib/db";
import { canEdit, loadChild, requireFamily } from "@/lib/family";
import { childSnapshot } from "@/lib/snapshot";
import { formatMinutes, timeAgo } from "@/lib/time";
import type { Signals } from "@/lib/tamper";
import { deviceHealth, Empty, HealthDot, ModePill, PlatformLabel } from "@/components/ui";
import { ActionForm, CodeField } from "@/components/Form";
import { ConnectPhone } from "@/components/ConnectPhone";
import { clearDeviceSignals, grantTime, removeChild, renameDevice, revokeDevice, setPaused } from "@/actions/children";

const SIGNAL_LABELS: Record<string, string> = {
  developerOptions: "Developer options on",
  usbDebugging: "USB debugging on",
  vpnActive: "Unknown VPN running",
  privateDns: "Private DNS changed",
  controlsPermissionRevoked: "Control permission turned off",
  profileRemoved: "Protection profile removed",
  secondaryUser: "Guest user / Secure Folder / cloned apps",
  assistedAccess: "Assisted Access on",
  safeMode: "Safe mode",
};

export default async function ChildOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { family, role } = await requireFamily();
  const editor = canEdit(role);
  const child = await loadChild(family.id, id);
  const devices = await db.device.findMany({ where: { childId: child.id, revokedAt: null }, orderBy: { enrolledAt: "asc" } });
  const snap = await childSnapshot({ ...child, devices }, family.timeZone);
  const appNames = new Map([...child.rules.apps.map((a) => [a.appId, a.name] as const), ...snap.topApps.map((a) => [a.appId, a.appName] as const)]);
  const located = devices.filter((d) => d.locationAt).sort((a, b) => b.locationAt!.getTime() - a.locationAt!.getTime())[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <section className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="h2">Right now</h2>
            <ModePill mode={snap.state.mode} reason={snap.state.reason} />
          </div>
          <p className="text-ink-700">{snap.state.reason}.{snap.state.dailyLimit !== null && ` ${formatMinutes(snap.state.remaining ?? 0)} of ${formatMinutes(snap.state.dailyLimit)} left today, shared across all of ${child.name}'s phones.`}</p>
          {snap.grants.length > 0 && <p className="hint">Bonus time today: {snap.grants.map((g) => `${g.minutes}m ${g.appId === "*" ? "screen time" : `for ${appNames.get(g.appId) ?? g.appId}`}`).join(", ")}</p>}
          {editor && (
            <div className="flex flex-wrap gap-2">
              <form action={setPaused.bind(null, child.id, !child.rules.paused)}>
                <button className={child.rules.paused ? "btn-primary" : "btn-soft"}>{child.rules.paused ? "Resume phones" : "Pause all phones now"}</button>
              </form>
              <form action={grantTime.bind(null, child.id)} className="flex gap-2">
                <select name="minutes" className="input w-auto py-2" defaultValue="15" aria-label="Bonus minutes">
                  {[15, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
                <button className="btn-soft">Give bonus time</button>
              </form>
            </div>
          )}
        </section>

        <section className="card space-y-4">
          <h2 className="h2">Phones</h2>
          {devices.length === 0 && <Empty title="No phones connected">Use “Connect a phone” to add an iPhone or Samsung.</Empty>}
          {devices.map((d) => {
            const h = deviceHealth(d, child.policy?.version ?? 0);
            const signals = Object.entries((d.signals ?? {}) as Signals).filter(([k, v]) => v === true && SIGNAL_LABELS[k]);
            return (
              <div key={d.id} className="rounded-xl border border-ink-100 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <HealthDot tone={h.tone} />
                  <span className="font-bold">{d.name}</span>
                  <span className="text-sm text-ink-500"><PlatformLabel platform={d.platform} />{d.model && ` · ${d.model}`}{d.osVersion && ` · ${d.osVersion}`}</span>
                  <span className="ml-auto text-sm font-semibold">{h.label}</span>
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {h.detail}
                  {d.battery !== null && ` · Battery ${d.battery}%`}
                  {Math.abs(d.clockSkewSeconds) > 300 && " · Phone clock is wrong (ignored)"}
                </p>
                {signals.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {signals.map(([k]) => <li key={k} className="pill bg-danger-50 text-danger-700">{SIGNAL_LABELS[k]}</li>)}
                  </ul>
                )}
                {editor && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-semibold text-ink-600">Manage</summary>
                    <div className="mt-3 space-y-4">
                      <form action={renameDevice.bind(null, d.id)} className="flex gap-2">
                        <input name="name" defaultValue={d.name} className="input" aria-label="Phone name" />
                        <button className="btn-soft">Rename</button>
                      </form>
                      {signals.length > 0 && (
                        <form action={clearDeviceSignals.bind(null, d.id)}>
                          <button className="btn-soft">I've checked it — unlock</button>
                          <p className="hint mt-1">If the problem is still there, the phone will lock again at its next check-in.</p>
                        </form>
                      )}
                      <ActionForm action={revokeDevice} submit="Remove this phone" variant="danger" pendingLabel="Removing…">
                        <input type="hidden" name="deviceId" value={d.id} />
                        <p className="hint">Removing stops protection on this phone. Only a parent can do this.</p>
                        <CodeField />
                      </ActionForm>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
          {editor && <ConnectPhone childId={child.id} childName={child.name} />}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card">
          <h2 className="h2">Today's apps</h2>
          {snap.topApps.length === 0 ? (
            <p className="hint mt-2">No usage reported yet today.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {snap.topApps.slice(0, 8).map((a) => (
                <li key={a.appId} className="flex justify-between gap-2">
                  <span className="truncate">{a.appName}</span>
                  <span className="shrink-0 font-semibold">{formatMinutes(a.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="h2">Location</h2>
          {located ? (
            <div className="mt-2 space-y-2 text-sm">
              <p>{located.name}, updated {timeAgo(located.locationAt)}{Date.now() - located.locationAt!.getTime() > 30 * 60_000 && <span className="pill ml-1 bg-warn-100 text-warn-700">may be out of date</span>}</p>
              <a className="btn-soft w-full" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${located.latitude}&mlon=${located.longitude}#map=16/${located.latitude}/${located.longitude}`}>Open map</a>
            </div>
          ) : (
            <p className="hint mt-2">No location yet. Phones share it when they check in.</p>
          )}
        </section>

        {role === "OWNER" && (
          <details className="card text-sm">
            <summary className="cursor-pointer font-semibold text-danger-700">Remove {child.name} from Haven</summary>
            <div className="mt-3">
              <ActionForm action={removeChild} submit={`Remove ${child.name}`} variant="danger" pendingLabel="Removing…">
                <input type="hidden" name="childId" value={child.id} />
                <p className="hint">Deletes their rules, phones, and history. Their phones stop being protected.</p>
                <CodeField />
              </ActionForm>
            </div>
          </details>
        )}
      </aside>
    </div>
  );
}
