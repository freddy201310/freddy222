// Tamper detection. Each check maps to a real bypass kids use against today's parental controls.
// Devices report raw signals; the server decides what they mean and alerts every parent.

export type Signals = {
  timeZone?: string;
  developerOptions?: boolean; // Android: opens the door to ADB-based removal
  usbDebugging?: boolean;
  vpnActive?: boolean; // a VPN the parent did not install
  privateDns?: boolean; // Android Private DNS / iOS encrypted DNS profile routing around the filter
  controlsPermissionRevoked?: boolean; // iOS Family Controls / Android device-admin or accessibility turned off
  profileRemoved?: boolean; // configuration / work profile removed
  secondaryUser?: boolean; // Android guest user, Secure Folder, or cloned apps
  assistedAccess?: boolean; // iOS Assisted Access, used to step around Screen Time
  safeMode?: boolean;
  appCount?: number;
};

export type Finding = { kind: string; severity: "INFO" | "WARNING" | "CRITICAL"; message: string };

const CLOCK_SKEW_LIMIT = 5 * 60; // seconds

export function analyzeHeartbeat(input: {
  deviceName: string;
  signals: Signals;
  previous: Signals;
  clockSkewSeconds: number;
  familyTimeZone: string;
  appliedPolicyVersion: number;
  currentPolicyVersion: number;
  policyChangedAt: Date;
  now: Date;
}): Finding[] {
  const { deviceName: d, signals: s, previous: p } = input;
  const out: Finding[] = [];
  const newly = (k: keyof Signals) => s[k] === true && p[k] !== true;

  if (Math.abs(input.clockSkewSeconds) > CLOCK_SKEW_LIMIT) {
    out.push({ kind: "clock_changed", severity: "WARNING", message: `${d}'s clock is ${describeSkew(input.clockSkewSeconds)}. Haven ignores the phone's clock, so this does not unlock anything.` });
  }
  if (s.timeZone && s.timeZone !== input.familyTimeZone && s.timeZone !== p.timeZone) {
    out.push({ kind: "timezone_changed", severity: "INFO", message: `${d} switched its time zone to ${s.timeZone}. Rules still follow your family's time zone.` });
  }
  if (newly("controlsPermissionRevoked")) out.push({ kind: "permission_revoked", severity: "CRITICAL", message: `Someone tried to turn off Haven's control permission on ${d}. The device is locked until you review it.` });
  if (newly("profileRemoved")) out.push({ kind: "profile_removed", severity: "CRITICAL", message: `A protection profile was removed from ${d}. The device is locked until you review it.` });
  if (newly("developerOptions") || newly("usbDebugging")) out.push({ kind: "developer_mode", severity: "CRITICAL", message: `Developer options or USB debugging were enabled on ${d}. These can be used to strip parental controls.` });
  if (newly("vpnActive")) out.push({ kind: "vpn", severity: "WARNING", message: `${d} turned on a VPN you didn't set up. Web filtering stays on because Haven blocks VPN apps it doesn't recognize.` });
  if (newly("privateDns")) out.push({ kind: "private_dns", severity: "WARNING", message: `${d} changed its private DNS, a common way around web filters. Haven reset it.` });
  if (newly("secondaryUser")) out.push({ kind: "secondary_space", severity: "WARNING", message: `A guest user, Secure Folder, or cloned app space appeared on ${d}.` });
  if (newly("assistedAccess")) out.push({ kind: "assisted_access", severity: "WARNING", message: `Assisted Access was turned on on ${d}.` });
  if (newly("safeMode")) out.push({ kind: "safe_mode", severity: "WARNING", message: `${d} was restarted in safe mode.` });
  if (s.appCount !== undefined && p.appCount !== undefined && s.appCount < p.appCount - 15) {
    out.push({ kind: "possible_reset", severity: "CRITICAL", message: `${d} suddenly reports far fewer apps. It may have been reset.` });
  }

  const staleMs = input.now.getTime() - input.policyChangedAt.getTime();
  if (input.appliedPolicyVersion < input.currentPolicyVersion && staleMs > 10 * 60_000) {
    out.push({ kind: "rules_not_applied", severity: "WARNING", message: `${d} hasn't confirmed your latest rule change. Haven keeps retrying and will tell you when it lands.` });
  }
  return out;
}

/** Signals that, while active, mean the device should stay locked (when lock-on-tamper is on). */
export const isTampered = (s: Signals) =>
  Boolean(s.controlsPermissionRevoked || s.profileRemoved || s.developerOptions || s.usbDebugging);

function describeSkew(seconds: number) {
  const mins = Math.round(Math.abs(seconds) / 60);
  const amount = mins >= 120 ? `${Math.round(mins / 60)} hours` : `${mins} minutes`;
  return seconds > 0 ? `set ${amount} ahead` : `set ${amount} behind`;
}
