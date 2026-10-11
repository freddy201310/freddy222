import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveFutureSelf, newFutureMeConversation } from "@/actions/futureMe";
import { Chat, type ChatMessage } from "@/components/Chat";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Future Me" };

const QUESTIONS = [
  { name: "whoBecome", label: "Who do you want to become?", placeholder: "Calm under pressure, creative every day, someone friends can count on…" },
  { name: "habits", label: "What habits do you want?", placeholder: "Morning walks, reading before bed, cooking at home…" },
  { name: "goals", label: "What are your goals?", placeholder: "Run a half marathon, start my own studio, learn Spanish…" },
  { name: "admire", label: "What kind of person do you admire?", placeholder: "My grandmother's patience, people who are kind without needing credit…" },
  { name: "values", label: "What do you want your life to stand for?", placeholder: "Kindness, curiosity, courage…" },
] as const;

export default async function FutureMePage() {
  const user = await requireUser();
  const [fs, convo] = await Promise.all([
    db.futureSelf.findUnique({ where: { userId: user.id } }),
    db.conversation.findFirst({
      where: { userId: user.id, mode: "future-me" },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
  ]);
  const messages: ChatMessage[] = (convo?.messages ?? []).map((m) => ({ id: m.id, role: m.role as ChatMessage["role"], content: m.content, rating: m.rating }));
  const hasProfile = Boolean(fs && (fs.whoBecome || fs.goals || fs.habits));

  return (
    <>
      <PageHeader eyebrow="Meet who you're becoming" title="Future Me" subtitle="Describe the person you're growing into. Then ask them for perspective — their answers come from your own goals and values." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form action={saveFutureSelf} className="card h-fit space-y-4 bg-gradient-to-b from-dawn-50 to-white">
          <div>
            <label className="label" htmlFor="horizon">How far into the future?</label>
            <select id="horizon" name="horizon" defaultValue={fs?.horizon ?? "5 years"} className="input">
              {["1 year", "3 years", "5 years", "10 years", "20 years"].map((h) => <option key={h}>{h}</option>)}
            </select>
          </div>
          {QUESTIONS.map((q) => (
            <div key={q.name}>
              <label className="label" htmlFor={q.name}>{q.label}</label>
              <textarea id={q.name} name={q.name} defaultValue={fs?.[q.name] ?? ""} placeholder={q.placeholder} maxLength={2000} className="input min-h-20" />
            </div>
          ))}
          <button className="btn-primary w-full">Save my Future Me</button>
        </form>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">🌅 Talk with Future Me</h2>
            {messages.length > 0 && (
              <form action={newFutureMeConversation}><button className="btn-ghost text-xs">Start fresh</button></form>
            )}
          </div>
          {!hasProfile && <p className="mb-4 rounded-2xl bg-sky-50 p-3 text-sm text-moss-700">Fill in a few answers first so Future Me can speak clearly.</p>}
          <Chat
            key={convo?.id ?? "new"}
            conversationId={convo?.id}
            initialMessages={messages}
            mode="future-me"
            persona={{ name: "Future Me", icon: "🌅" }}
            placeholder="Ask Future Me anything…"
            starters={[
              "What would Future Me tell me right now?",
              "What should I stop worrying about?",
              "What habit mattered most for getting to you?",
              "I'm doubting myself today. What do you see in me?",
            ]}
          />
        </section>
      </div>
    </>
  );
}
