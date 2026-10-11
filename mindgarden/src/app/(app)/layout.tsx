import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deliverDueLetters } from "@/lib/letters";
import { db } from "@/lib/db";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.onboarded) redirect("/onboarding");
  await deliverDueLetters(user.id);
  const unread = await db.letter.count({ where: { userId: user.id, deliveredAt: { not: null }, openedAt: null } });

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-moss-50/60 lg:flex">
      <AppNav name={user.name} unreadLetters={unread} />
      <main className="flex-1 px-4 pb-24 pt-6 sm:px-8 lg:pb-10 lg:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
