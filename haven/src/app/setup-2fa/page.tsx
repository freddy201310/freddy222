import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { newTotpSecret, otpauthUrl } from "@/lib/totp";
import { ensurePendingSecret } from "@/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Set up two-step sign-in" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Replacing an existing authenticator needs a fully signed-in session.
  if (session.parent.totpSecret && !session.mfaPassed) redirect("/login/verify");
  const { next = "" } = await searchParams;
  const secret = newTotpSecret();
  await ensurePendingSecret(session.parent.id, secret);
  const qr = await QRCode.toDataURL(otpauthUrl(secret, session.parent.email), { margin: 1, width: 220 });
  const relinking = Boolean(session.parent.totpSecret);
  return (
    <AuthShell
      title={relinking ? "Link a new authenticator" : "Turn on two-step sign-in"}
      subtitle="Required for every parent. Even if your child learns your password, they can't sign in without your phone."
    >
      <ol className="space-y-2 text-sm text-ink-700">
        <li>1. Install an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, or Apple Passwords).</li>
        <li>2. Scan this code with it.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR code for your authenticator app" width={220} height={220} className="mx-auto my-4 rounded-xl border border-ink-100" />
      <details className="mb-4 text-sm text-ink-500">
        <summary className="cursor-pointer">Can't scan? Enter this key instead</summary>
        <code className="mt-2 block break-all rounded-lg bg-ink-50 p-2 font-mono text-ink-800">{secret.match(/.{1,4}/g)?.join(" ")}</code>
      </details>
      <SetupForm next={next.startsWith("/invite/") ? next : relinking ? "/settings" : "/onboarding"} />
    </AuthShell>
  );
}
