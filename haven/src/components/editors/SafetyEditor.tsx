"use client";

import { useState } from "react";
import type { Rules } from "@/lib/rules";
import { useSave } from "./useSave";
import { SaveBar } from "./SaveBar";
import { Toggle } from "./Toggle";

export function SafetyEditor({ childId, rules, readOnly }: { childId: string; rules: Rules; readOnly: boolean }) {
  const [requests, setRequests] = useState(rules.requests);
  const [tamper, setTamper] = useState(rules.tamper);
  const [always, setAlways] = useState(rules.alwaysAllowed);
  const [location, setLocation] = useState(rules.location);
  const { state, pending, save } = useSave(childId);

  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <section className="card space-y-4">
        <div>
          <h2 className="h2">Asking for more time</h2>
          <p className="hint">Requests go to every parent. Approved time only unlocks the one app it was asked for — never the whole phone — and the phone can't approve itself.</p>
        </div>
        <Toggle checked={requests.enabled} onChange={(v) => setRequests({ ...requests, enabled: v })} label="Let my child ask for more time" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="maxPerDay">Requests per day</label>
            <select id="maxPerDay" className="input" value={requests.maxPerDay} onChange={(e) => setRequests({ ...requests, maxPerDay: Number(e.target.value) })}>
              {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="maxMinutes">Most minutes per request</label>
            <select id="maxMinutes" className="input" value={requests.maxMinutesPerRequest} onChange={(e) => setRequests({ ...requests, maxMinutesPerRequest: Number(e.target.value) })}>
              {[15, 30, 60, 120].map((n) => <option key={n} value={n}>{n} min</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="h2">Bypass protection</h2>
          <p className="hint">Haven watches for the tricks kids use: turning off permissions, developer mode, VPNs, factory resets, guest users, and changing the clock.</p>
        </div>
        <Toggle checked={tamper.lockOnTamper} onChange={(v) => setTamper({ ...tamper, lockOnTamper: v })} label="Lock the phone when a bypass is detected" hint="Calls and the “I need help” button keep working. You unlock it after you've looked." />
        <div>
          <label className="label" htmlFor="offline">Alert me when a phone goes silent for</label>
          <select id="offline" className="input max-w-xs" value={tamper.offlineAlertMinutes} onChange={(e) => setTamper({ ...tamper, offlineAlertMinutes: Number(e.target.value) })}>
            {[15, 30, 60, 120, 240, 480].map((n) => <option key={n} value={n}>{n < 60 ? `${n} minutes` : `${n / 60} hour${n > 60 ? "s" : ""}`}</option>)}
          </select>
          <p className="hint mt-1">A reset or removed app looks like silence, so Haven tells you instead of failing quietly.</p>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="h2">Always available</h2>
          <p className="hint">These keep working during downtime, after the daily limit, and when the phone is paused.</p>
        </div>
        <Toggle checked label="Phone calls and emergency services" hint="Can't be turned off." onChange={() => undefined} />
        <Toggle checked={always.maps} onChange={(v) => setAlways({ ...always, maps: v })} label="Maps" />
        <Toggle checked={always.approvedContactsMessaging} onChange={(v) => setAlways({ ...always, approvedContactsMessaging: v })} label="Messages with approved contacts" />
      </section>

      <section className="card space-y-4">
        <h2 className="h2">Location</h2>
        <Toggle checked={location.enabled} onChange={(v) => setLocation({ enabled: v })} label="Share this child's phone location with parents" hint="Haven keeps only the latest location, never a history. The “I need help” button always sends location." />
      </section>

      <SaveBar state={state} pending={pending} readOnly={readOnly} onSave={() => save({ requests, tamper, alwaysAllowed: always, location })} />
    </fieldset>
  );
}
