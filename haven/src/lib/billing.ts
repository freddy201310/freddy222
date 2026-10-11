import { billingEnabled } from "./stripe";

const ACTIVE = new Set(["active", "trialing"]);

export type BillingState = { enabled: boolean; active: boolean; trialDaysLeft: number; needsPayment: boolean; status: string | null };

/**
 * Lapsed billing never switches protection off: phones already connected keep their rules.
 * It only stops new phones from being connected until the family subscribes.
 */
export function billingState(family: { trialEndsAt: Date; subscriptionStatus: string | null }, now = new Date()): BillingState {
  const enabled = billingEnabled();
  const trialDaysLeft = Math.max(0, Math.ceil((family.trialEndsAt.getTime() - now.getTime()) / 86_400_000));
  const active = !enabled || ACTIVE.has(family.subscriptionStatus ?? "") || trialDaysLeft > 0;
  return { enabled, active, trialDaysLeft, needsPayment: enabled && !active, status: family.subscriptionStatus };
}
