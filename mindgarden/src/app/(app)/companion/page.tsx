import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { Chat } from "@/components/Chat";
import { ConversationList } from "./ConversationList";

export const metadata = { title: "Companion" };

export default async function CompanionPage() {
  const user = await requireUser();
  const goal = await db.manualEntry.findFirst({ where: { userId: user.id, category: "GOAL" }, orderBy: { strength: "desc" } });
  const starters = [
    "I have a lot on my mind and want to sort through it.",
    goal ? `Can we check in on my goal: "${goal.content}"?` : "Help me figure out what I want to focus on.",
    "Something good happened today and I want to reflect on it.",
    "I'm feeling stuck and unmotivated.",
  ];
  return (
    <div className="flex gap-8">
      <ConversationList userId={user.id} />
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-semibold">Hi {user.name.split(" ")[0]}, I&apos;m listening.</h1>
        <p className="mb-6 mt-2 text-moss-700">
          Share whatever&apos;s on your mind. I&apos;ll remember what matters to you — and rating my replies helps me learn how to help you best.
        </p>
        {!aiEnabled() && <p className="mb-4 rounded-2xl bg-sky-50 p-3 text-sm text-sky-500">Offline mode: replies are simple until an AI key is configured.</p>}
        <Chat initialMessages={[]} starters={starters} />
      </div>
    </div>
  );
}
