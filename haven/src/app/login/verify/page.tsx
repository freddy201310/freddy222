import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm, CodeField } from "@/components/Form";
import { verifySecondStep } from "@/actions/auth";

export const metadata = { title: "Two-step sign-in" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.parent.totpSecret) redirect("/setup-2fa");
  if (session.mfaPassed) redirect("/dashboard");
  const { next = "" } = await searchParams;
  return (
    <AuthShell title="Enter your code" subtitle="Open your authenticator app and enter the 6-digit Haven code. Lost your phone? Use a recovery code.">
      <ActionForm action={verifySecondStep} submit="Sign in" pendingLabel="Checking…">
        <input type="hidden" name="next" value={next} />
        <CodeField label="6-digit code or recovery code" />
      </ActionForm>
    </AuthShell>
  );
}
