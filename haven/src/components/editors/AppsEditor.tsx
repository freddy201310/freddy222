"use client";

import { useState } from "react";
import { APP_CATEGORIES, type AppRule, type Rules } from "@/lib/rules";
import { useSave } from "./useSave";
import { SaveBar } from "./SaveBar";

type CatRule = Rules["categories"][string];

export function AppsEditor({ childId, rules, readOnly }: { childId: string; rules: Rules; readOnly: boolean }) {
  const [categories, setCategories] = useState(rules.categories);
  const [apps, setApps] = useState(rules.apps);
  const [installs, setInstalls] = useState(rules.installs);
  const [communication, setCommunication] = useState(rules.communication);
  const [draft, setDraft] = useState<AppRule>({ appId: "", name: "", rule: "limit", minutes: 30 });
  const { state, pending, save } = useSave(childId);

  const setCat = (id: string, r: CatRule) => setCategories((c) => ({ ...c, [id]: r }));
  const addApp = () => {
    if (!draft.name.trim() || !draft.appId.trim()) return;
    setApps((a) => [...a.filter((x) => x.appId !== draft.appId.trim()), { ...draft, appId: draft.appId.trim(), name: draft.name.trim() }]);
    setDraft({ appId: "", name: "", rule: "limit", minutes: 30 });
  };

  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <section className="card space-y-3">
        <div>
          <h2 className="h2">App types</h2>
          <p className="hint">Applies on both iPhone and Samsung. New apps in a category follow its rule automatically.</p>
        </div>
        <ul className="divide-y divide-ink-100">
          {APP_CATEGORIES.map((c) => {
            const r = categories[c.id] ?? { rule: "allow" as const };
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-3">
                <span className="flex-1 font-semibold">{c.label}</span>
                <select className="input w-auto py-1.5" value={r.rule} onChange={(e) => setCat(c.id, { rule: e.target.value as CatRule["rule"], minutes: r.minutes ?? 60 })} aria-label={`${c.label} rule`}>
                  <option value="allow">Allowed</option>
                  <option value="limit">Time limit</option>
                  <option value="block">Blocked</option>
                </select>
                {r.rule === "limit" && (
                  <select className="input w-auto py-1.5" value={r.minutes ?? 60} onChange={(e) => setCat(c.id, { rule: "limit", minutes: Number(e.target.value) })} aria-label={`${c.label} minutes`}>
                    {[15, 30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m} min/day</option>)}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="h2">Specific apps</h2>
          <p className="hint">Override the category for one app: always allow a school app, block one game, or give one app its own limit. An app's own limit includes its own time, so it can't borrow time from other apps.</p>
        </div>
        {apps.length > 0 && (
          <ul className="divide-y divide-ink-100">
            {apps.map((a, i) => (
              <li key={a.appId} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="flex-1">
                  <span className="font-semibold">{a.name}</span> <span className="text-xs text-ink-400">{a.appId}</span>
                </span>
                <select className="input w-auto py-1.5" value={a.rule} onChange={(e) => setApps((x) => x.map((y, j) => (j === i ? { ...y, rule: e.target.value as AppRule["rule"] } : y)))} aria-label={`${a.name} rule`}>
                  <option value="always">Always allowed</option>
                  <option value="limit">Own limit</option>
                  <option value="block">Blocked</option>
                </select>
                {a.rule === "limit" && (
                  <input type="number" min={0} max={1440} className="input w-24 py-1.5" value={a.minutes ?? 30} onChange={(e) => setApps((x) => x.map((y, j) => (j === i ? { ...y, minutes: Number(e.target.value) } : y)))} aria-label={`${a.name} minutes`} />
                )}
                <button type="button" className="btn-ghost px-2 text-danger-700" onClick={() => setApps((x) => x.filter((_, j) => j !== i))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 rounded-xl bg-ink-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input className="input" placeholder="App name (e.g. Roblox)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input" placeholder="App ID (e.g. com.roblox.robloxmobile)" value={draft.appId} onChange={(e) => setDraft({ ...draft, appId: e.target.value })} />
          <select className="input" value={draft.rule} onChange={(e) => setDraft({ ...draft, rule: e.target.value as AppRule["rule"] })} aria-label="Rule">
            <option value="always">Always allowed</option>
            <option value="limit">Own limit</option>
            <option value="block">Blocked</option>
          </select>
          <button type="button" className="btn-soft" onClick={addApp}>Add</button>
        </div>
        <p className="hint">Apps your child has used show their IDs on the Overview tab.</p>
      </section>

      <section className="card space-y-4">
        <h2 className="h2">New apps & contacts</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="installs">Installing new apps</label>
            <select id="installs" className="input" value={installs.mode} onChange={(e) => setInstalls({ ...installs, mode: e.target.value as Rules["installs"]["mode"] })}>
              <option value="ask">Ask a parent first</option>
              <option value="allow">Allowed (within the age rating)</option>
              <option value="block">Not allowed</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rating">Highest app age rating</label>
            <select id="rating" className="input" value={installs.maxAgeRating} onChange={(e) => setInstalls({ ...installs, maxAgeRating: e.target.value as Rules["installs"]["maxAgeRating"] })}>
              {(["4+", "9+", "12+", "17+"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="comm">Who can call and message</label>
            <select id="comm" className="input" value={communication} onChange={(e) => setCommunication(e.target.value as Rules["communication"])}>
              <option value="approved">Only contacts a parent approved</option>
              <option value="contacts">Anyone in their contacts</option>
              <option value="everyone">Everyone</option>
            </select>
            <p className="hint mt-1">Emergency numbers always work.</p>
          </div>
        </div>
      </section>

      <SaveBar state={state} pending={pending} readOnly={readOnly} onSave={() => save({ categories, apps, installs, communication })} />
    </fieldset>
  );
}
