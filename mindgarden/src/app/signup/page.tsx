import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Create your garden" };

export default async function SignupPage() {
  if (await getUser()) redirect("/dashboard");
  return (
    <AuthShell title="Plant your garden" subtitle="A private space to grow, reflect, and find calm.">
      <AuthForm mode="signup" />
      <p className="mt-6 text-xs leading-relaxed text-moss-500">
        MindGarden is a personal growth companion, not therapy, medical care, or a crisis service.
      </p>
    </AuthShell>
  );
}
