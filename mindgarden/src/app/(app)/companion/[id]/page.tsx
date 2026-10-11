import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Chat, type ChatMessage } from "@/components/Chat";
import { deleteConversation } from "@/actions/companion";
import { ConversationList } from "../ConversationList";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const convo = await db.conversation.findFirst({
    where: { id, userId: user.id, mode: "companion" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo) notFound();
  const messages: ChatMessage[] = convo.messages.map((m) => ({ id: m.id, role: m.role as ChatMessage["role"], content: m.content, rating: m.rating }));

  return (
    <div className="flex gap-8">
      <ConversationList userId={user.id} activeId={id} />
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h1 className="line-clamp-2 text-2xl font-semibold">{convo.title}</h1>
          <form action={deleteConversation.bind(null, id)}>
            <button className="btn-ghost text-xs text-moss-500">Delete</button>
          </form>
        </div>
        <Chat key={id} conversationId={id} initialMessages={messages} />
      </div>
    </div>
  );
}
