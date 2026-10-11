import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next = "", reset } = await searchParams;
  return (
    <AuthShell title="Parent sign-in" subtitle="Haven has no child logins. Only parents can get in here.">
      {reset && <p role="status" className="mb-4 rounded-xl bg-haven-50 px-3.5 py-2 text-sm text-haven-800">Password changed. Sign in with your new password.</p>}
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
