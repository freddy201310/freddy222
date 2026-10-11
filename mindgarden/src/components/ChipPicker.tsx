"use client";

export function ChipPicker({
  options,
  value,
  onChange,
  max,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((v) => v !== o));
    else if (!max || value.length < max) onChange([...value, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => toggle(o)}
          aria-pressed={value.includes(o)}
          className={`chip ${value.includes(o) ? "chip-on" : ""}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
