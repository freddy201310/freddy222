import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/family";
import { verifyStripeSignature } from "@/lib/stripe";

type Subscription = { id: string; customer: string; status: string };
type CheckoutSession = { customer: string; subscription: string | null; client_reference_id: string | null };

// Stripe → Haven. Point a webhook at /api/stripe/webhook for checkout.session.completed and
// customer.subscription.created / updated / deleted, and put its signing secret in STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await req.text();
  if (!secret || !verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: unknown } };

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as CheckoutSession;
    if (s.client_reference_id) {
      const family = await db.family.findUnique({ where: { id: s.client_reference_id } });
      if (family) {
        await db.family.update({ where: { id: family.id }, data: { stripeCustomerId: s.customer, stripeSubscriptionId: s.subscription, subscriptionStatus: family.subscriptionStatus ?? "active" } });
        await audit(family.id, null, "billing.subscribed");
      }
    }
  } else if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Subscription;
    const family = await db.family.findUnique({ where: { stripeCustomerId: sub.customer } });
    if (family) {
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
      await db.family.update({ where: { id: family.id }, data: { stripeSubscriptionId: sub.id, subscriptionStatus: status } });
      if (status !== family.subscriptionStatus) await audit(family.id, null, "billing.status", status);
    }
  }
  return NextResponse.json({ received: true });
}
