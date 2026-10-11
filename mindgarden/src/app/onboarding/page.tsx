import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.onboarded) redirect("/dashboard");
  return <Onboarding name={user.name.split(" ")[0]} />;
}
