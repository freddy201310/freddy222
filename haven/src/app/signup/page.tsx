import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Create your parent account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  return (
    <AuthShell title="Create your parent account" subtitle="Next you'll link an authenticator app on your phone, so a password alone can never unlock Haven.">
      <AuthForm mode="signup" next={next} />
    </AuthShell>
  );
}
