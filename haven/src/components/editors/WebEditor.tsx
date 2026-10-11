"use client";

import { useState } from "react";
import { WEB_CATEGORIES, type Rules } from "@/lib/rules";
import { useSave } from "./useSave";
import { SaveBar } from "./SaveBar";
import { Toggle } from "./Toggle";

const toList = (s: string) => [...new Set(s.split(/[\s,]+/).map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "")).filter(Boolean))];

export function WebEditor({ childId, rules, readOnly }: { childId: string; rules: Rules; readOnly: boolean }) {
  const [web, setWeb] = useState(rules.web);
  const [blockText, setBlockText] = useState(rules.web.blockDomains.join("\n"));
  const [allowText, setAllowText] = useState(rules.web.allowDomains.join("\n"));
  const { state, pending, save } = useSave(childId);
  const set = (p: Partial<Rules["web"]>) => setWeb((w) => ({ ...w, ...p }));

  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <section className="card space-y-4">
        <div>
          <h2 className="h2">Filtering everywhere</h2>
          <p className="hint">Haven filters at the network level on the phone, so it covers every browser and the browsers hidden inside apps — not just Safari or Chrome.</p>
        </div>
        <Toggle checked={web.safeSearch} onChange={(v) => set({ safeSearch: v })} label="Force SafeSearch" hint="Google, Bing, and DuckDuckGo always return filtered results." />
        <Toggle checked={web.youtubeRestricted} onChange={(v) => set({ youtubeRestricted: v })} label="YouTube Restricted Mode" hint="Applies in the app, the website, and signed-out or guest viewing." />
        <Toggle checked={web.filterInAppBrowsers} onChange={(v) => set({ filterInAppBrowsers: v })} label="Filter browsers inside apps" hint="Links opened inside TikTok, Instagram, Discord, games, and Messages previews." />
        <Toggle checked={web.blockPrivateDnsAndVpn} onChange={(v) => set({ blockPrivateDnsAndVpn: v })} label="Block VPNs and private DNS" hint="The most common way kids switch web filters off." />
        <Toggle checked={web.allowListOnly} onChange={(v) => set({ allowListOnly: v })} label="Only allow approved sites" hint="Best for young children. Everything not on the allowed list is blocked." />
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Blocked categories</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEB_CATEGORIES.map((c) => {
            const on = web.blockCategories.includes(c.id);
            return (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink-100 px-3 py-2">
                <input type="checkbox" className="h-4 w-4 accent-haven-600" checked={on} onChange={() => set({ blockCategories: on ? web.blockCategories.filter((x) => x !== c.id) : [...web.blockCategories, c.id] })} />
                <span className="text-sm">{c.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="block">Always block</label>
          <textarea id="block" rows={6} className="input font-mono text-sm" value={blockText} onChange={(e) => setBlockText(e.target.value)} placeholder={"example.com\nanother-site.net"} />
          <p className="hint mt-1">One per line. Includes all subdomains.</p>
        </div>
        <div>
          <label className="label" htmlFor="allow">Always allow</label>
          <textarea id="allow" rows={6} className="input font-mono text-sm" value={allowText} onChange={(e) => setAllowText(e.target.value)} placeholder={"school.org\nkhanacademy.org"} />
          <p className="hint mt-1">Wins over everything else, so school sites never get caught by a filter.</p>
        </div>
      </section>

      <SaveBar state={state} pending={pending} readOnly={readOnly} onSave={() => save({ web: { ...web, blockDomains: toList(blockText), allowDomains: toList(allowText) } })} />
    </fieldset>
  );
}
