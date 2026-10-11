import type { Severity } from "@prisma/client";

const RANK: Record<Severity, number> = { INFO: 0, WARNING: 1, CRITICAL: 2 };

/** Should a parent with this threshold hear about an alert of this severity? */
export const wantsAlert = (threshold: Severity, severity: Severity) => RANK[severity] >= RANK[threshold];
