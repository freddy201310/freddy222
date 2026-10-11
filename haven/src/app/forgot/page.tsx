import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/Form";
import { requestPasswordReset } from "@/actions/auth";

export const metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link. You'll still need your authenticator code to sign in.">
      <ActionForm action={requestPasswordReset} submit="Send reset link" pendingLabel="Sending…">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        </div>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-ink-500">
        <Link href="/login" className="font-semibold text-haven-700 underline underline-offset-4">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
