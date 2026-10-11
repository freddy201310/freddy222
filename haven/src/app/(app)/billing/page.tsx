import { requireFamily } from "@/lib/family";
import { billingState } from "@/lib/billing";
import { openPortal, startCheckout } from "@/actions/billing";

export const metadata = { title: "Billing" };

const PRICE = process.env.NEXT_PUBLIC_PRICE_LABEL ?? "";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const { family, role } = await requireFamily();
  const { success } = await searchParams;
  const b = billingState(family);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="h1">Billing</h1>
      {success && <p role="status" className="rounded-xl bg-haven-50 px-4 py-3 text-haven-800">Thank you! Your subscription is being set up. This page updates within a minute.</p>}
      {!b.enabled ? (
        <div className="card"><p>Haven is free for your family right now.</p></div>
      ) : (
        <div className="card space-y-4">
          <p className="text-lg font-semibold">
            {b.status === "active" ? "Your subscription is active." : b.status === "trialing" || (b.trialDaysLeft > 0 && !b.status) ? `Free trial: ${b.trialDaysLeft} day${b.trialDaysLeft === 1 ? "" : "s"} left.` : b.status === "past_due" ? "Your last payment didn't go through." : "Your free trial has ended."}
          </p>
          <p className="hint">One subscription covers every child and every phone in your family{PRICE ? ` for ${PRICE}` : ""}. If a subscription lapses, phones already connected stay protected — you just can't connect new ones until it's renewed.</p>
          {role === "OWNER" ? (
            family.stripeSubscriptionId ? (
              <form action={openPortal}><button className="btn-soft">Manage payment method or cancel</button></form>
            ) : (
              <form action={startCheckout}><button className="btn-primary">Subscribe</button></form>
            )
          ) : (
            <p className="hint">Only the family owner can manage billing.</p>
          )}
        </div>
      )}
    </div>
  );
}
