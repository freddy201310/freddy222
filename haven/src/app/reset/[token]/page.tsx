import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/Form";
import { resetPassword } from "@/actions/auth";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthShell title="Choose a new password" subtitle="Every device signed in to your account will be signed out.">
      <ActionForm action={resetPassword} submit="Save new password">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" name="password" type="password" className="input" minLength={10} autoComplete="new-password" required />
          <p className="hint mt-1.5">At least 10 characters. Don't reuse your phone passcode.</p>
        </div>
      </ActionForm>
    </AuthShell>
  );
}
