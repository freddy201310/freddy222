import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getUser()) redirect("/dashboard");
  return (
    <AuthShell title="Welcome back" subtitle="Your garden missed you.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
