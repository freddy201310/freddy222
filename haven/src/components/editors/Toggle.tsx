"use client";

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-ink-200 transition peer-checked:bg-haven-600 peer-focus-visible:ring-2 peer-focus-visible:ring-haven-400 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" aria-hidden />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="hint block">{hint}</span>}
      </span>
    </label>
  );
}
