import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  return (
    <AuthShell title="Parent sign-in" subtitle="Haven has no child logins. Only parents can get in here.">
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
