"use client";

import { useEffect, useState } from "react";

const COMMON = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "America/Toronto", "Europe/London", "Europe/Paris", "Asia/Jerusalem", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];

export function TimeZoneSelect({ value }: { value?: string }) {
  const [tz, setTz] = useState(value ?? "America/New_York");
  const [all, setAll] = useState<string[]>(COMMON);
  useEffect(() => {
    const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? COMMON;
    setAll(zones);
    if (!value) setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [value]);
  return (
    <select id="timeZone" name="timeZone" className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
      {[...new Set([tz, ...all])].map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
    </select>
  );
}
