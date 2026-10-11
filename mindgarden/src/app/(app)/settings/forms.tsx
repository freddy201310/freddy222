"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, clearMemory, deleteAccount, saveProfile, type SettingsState } from "@/actions/settings";
import { ChipPicker } from "@/components/ChipPicker";
import { INTERESTS, TONES } from "@/lib/options";

type Tone = "warm" | "direct" | "playful" | "calm";

export function ProfileForm(props: { name: string; tone: string; interests: string[]; aiMemoryEnabled: boolean }) {
  const [name, setName] = useState(props.name);
  const [tone, setTone] = useState(props.tone as Tone);
  const [interests, setInterests] = useState(props.interests);
  const [memory, setMemory] = useState(props.aiMemoryEnabled);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = () => setSaved(false);

  return (
    <div className="mt-4 space-y-5">
      <div className="max-w-sm">
        <label className="label" htmlFor="s-name">Name</label>
        <input id="s-name" className="input" value={name} onChange={(e) => { setName(e.target.value); dirty(); }} maxLength={60} />
      </div>
      <div>
        <p className="label">Companion style</p>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button key={t.id} type="button" aria-pressed={tone === t.id} className={`chip ${tone === t.id ? "chip-on" : ""}`} onClick={() => { setTone(t.id as Tone); dirty(); }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Interests</p>
        <ChipPicker options={INTERESTS} value={interests} onChange={(v) => { setInterests(v); dirty(); }} />
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-moss-50 p-4 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-moss-600" checked={memory} onChange={(e) => { setMemory(e.target.checked); dirty(); }} />
        <span><strong>Learn from my conversations and journal.</strong> When on, MindGarden adds things you share (goals, what helps you) to your Life Manual. When off, nothing new is added automatically.</span>
      </label>
      <button className="btn-primary" disabled={pending || !name.trim()} onClick={() => start(async () => { await saveProfile({ name, tone, interests, aiMemoryEnabled: memory }); setSaved(true); })}>
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="mt-4 grid max-w-md gap-3">
      <input name="current" type="password" className="input" placeholder="Current password" autoComplete="current-password" required />
      <input name="next" type="password" className="input" placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required />
      {state?.error && <p className="text-sm text-bark-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-moss-600">{state.ok}</p>}
      <button className="btn-soft w-fit" disabled={pending}>Update password</button>
    </form>
  );
}

const CLEARABLE = [
  { id: "manual", label: "Life Manual" },
  { id: "conversations", label: "Conversations" },
  { id: "journal", label: "Journal" },
  { id: "moods", label: "Mood check-ins" },
] as const;

export function ClearButtons() {
  const [done, setDone] = useState<string[]>([]);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {CLEARABLE.map((c) => (
        <button
          key={c.id}
          className="btn-soft text-xs"
          disabled={pending || done.includes(c.id)}
          onClick={() => {
            if (!confirm(`Permanently delete your ${c.label.toLowerCase()}? This can't be undone.`)) return;
            start(async () => { await clearMemory(c.id); setDone((d) => [...d, c.id]); });
          }}
        >
          {done.includes(c.id) ? `${c.label} cleared` : `Clear ${c.label.toLowerCase()}`}
        </button>
      ))}
    </div>
  );
}

export function DeleteAccount() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(deleteAccount, undefined);
  return (
    <form action={action} className="mt-4 flex max-w-md flex-wrap gap-2">
      <label htmlFor="confirm" className="sr-only">Type DELETE to confirm</label>
      <input id="confirm" name="confirm" className="input flex-1" placeholder='Type "DELETE" to confirm' autoComplete="off" />
      <button className="btn bg-bark-700 text-white hover:bg-bark-900" disabled={pending}>{pending ? "Deleting…" : "Delete forever"}</button>
      {state?.error && <p className="w-full text-sm text-bark-700">{state.error}</p>}
    </form>
  );
}
