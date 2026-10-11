import type { Device } from "@prisma/client";
import type { Mode } from "@/lib/engine";
import { timeAgo } from "@/lib/time";
import { isTampered, type Signals } from "@/lib/tamper";

export const AVATAR: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700",
};

export function Avatar({ name, color, size = "md" }: { name: string; color: string; size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${AVATAR[color] ?? AVATAR.indigo} ${size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10"}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const MODE: Record<Mode, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-haven-100 text-haven-800" },
  schedule: { label: "Scheduled block", cls: "bg-ink-100 text-ink-700" },
  limit: { label: "Time's up", cls: "bg-warn-100 text-warn-700" },
  paused: { label: "Paused", cls: "bg-ink-800 text-white" },
  tamper: { label: "Locked: bypass attempt", cls: "bg-danger-100 text-danger-700" },
};

export const ModePill = ({ mode, reason }: { mode: Mode; reason?: string }) => (
  <span className={`pill ${MODE[mode].cls}`} title={reason}>{MODE[mode].label}</span>
);

export type DeviceHealth = { label: string; tone: "good" | "warn" | "bad"; detail: string };

/** One honest status line per phone: is it actually protected right now? */
export function deviceHealth(d: Pick<Device, "lastSeenAt" | "appliedPolicyVersion" | "signals" | "offlineAlertedAt">, policyVersion: number, now = new Date()): DeviceHealth {
  const signals = (d.signals ?? {}) as Signals;
  if (!d.lastSeenAt) return { label: "Waiting for first check-in", tone: "warn", detail: "Finish setup on the phone." };
  if (isTampered(signals)) return { label: "Bypass attempt", tone: "bad", detail: "Locked until you review it." };
  if (d.offlineAlertedAt) return { label: "Offline", tone: "bad", detail: `Last seen ${timeAgo(d.lastSeenAt, now)}` };
  if (d.appliedPolicyVersion < policyVersion) return { label: "Updating rules…", tone: "warn", detail: `Last seen ${timeAgo(d.lastSeenAt, now)}` };
  return { label: "Protected", tone: "good", detail: `Checked in ${timeAgo(d.lastSeenAt, now)}` };
}

const TONE = { good: "bg-haven-500", warn: "bg-warn-500", bad: "bg-danger-500" };
export const HealthDot = ({ tone }: { tone: DeviceHealth["tone"] }) => <span className={`inline-block h-2.5 w-2.5 rounded-full ${TONE[tone]}`} aria-hidden />;

export const PlatformLabel = ({ platform }: { platform: "IOS" | "ANDROID" }) => <>{platform === "IOS" ? "iPhone" : "Samsung / Android"}</>;

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-white/60 p-8 text-center">
      <p className="font-semibold text-ink-700">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-500">{children}</div>}
    </div>
  );
}
