"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { audit, requireFamily } from "@/lib/family";
import { billingEnabled, stripe } from "@/lib/stripe";

async function ensureCustomer(family: { id: string; name: string; stripeCustomerId: string | null }, email: string) {
  if (family.stripeCustomerId) return family.stripeCustomerId;
  const customer = await stripe<{ id: string }>("customers", { email, name: family.name, metadata: { familyId: family.id } });
  await db.family.update({ where: { id: family.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function startCheckout() {
  const { family, parent, role } = await requireFamily();
  if (role !== "OWNER" || !billingEnabled()) redirect("/billing");
  const customer = await ensureCustomer(family, parent.email);
  // Carry over any remaining free trial so nobody pays for days they already had free.
  const trialEnd = Math.floor(family.trialEndsAt.getTime() / 1000);
  const keepTrial = trialEnd > Date.now() / 1000 + 48 * 3600;
  const session = await stripe<{ url: string }>("checkout/sessions", {
    mode: "subscription",
    customer,
    client_reference_id: family.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { metadata: { familyId: family.id }, ...(keepTrial ? { trial_end: trialEnd } : {}) },
    success_url: `${appUrl()}/billing?success=1`,
    cancel_url: `${appUrl()}/billing`,
  });
  await audit(family.id, parent.id, "billing.checkout_started");
  redirect(session.url);
}

export async function openPortal() {
  const { family, role } = await requireFamily();
  if (role !== "OWNER" || !family.stripeCustomerId) redirect("/billing");
  const session = await stripe<{ url: string }>("billing_portal/sessions", { customer: family.stripeCustomerId, return_url: `${appUrl()}/billing` });
  redirect(session.url);
}
