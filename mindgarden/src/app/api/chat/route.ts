import { after } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiEnabled, streamReply } from "@/lib/ai";
import { COMPANION_SYSTEM, FUTURE_ME_SYSTEM } from "@/lib/prompts";
import { loadUserContext, renderUserContext } from "@/lib/memory";
import { fallbackCompanionReply, fallbackFutureMe } from "@/lib/fallbacks";
import { learnFromExchange } from "@/lib/learn";
import { needsSupport, SUPPORT_MESSAGE } from "@/lib/safety";

export const maxDuration = 120;

const Body = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().min(1).max(8000),
  mode: z.enum(["companion", "future-me"]).default("companion"),
});

export type ChatEvent =
  | { type: "meta"; conversationId: string; userMessageId: string; support: boolean }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string }
  | { type: "error"; message: string };

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { message, mode } = parsed.data;

  let conversation = parsed.data.conversationId
    ? await db.conversation.findFirst({ where: { id: parsed.data.conversationId, userId: user.id } })
    : null;
  if (!conversation) {
    conversation = await db.conversation.create({
      data: { userId: user.id, mode, title: message.length > 60 ? message.slice(0, 57).trimEnd() + "…" : message },
    });
  }
  const conversationId = conversation.id;
  const history = await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "desc" }, take: 40 });
  const userMsg = await db.message.create({ data: { conversationId, role: "user", content: message } });

  const ctx = await loadUserContext(user.id);
  const turns = [...history.reverse(), userMsg].map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const support = needsSupport(message);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      send({ type: "meta", conversationId, userMessageId: userMsg.id, support });
      let reply = "";
      try {
        if (aiEnabled()) {
          for await (const text of streamReply({
            system: conversation.mode === "future-me" ? FUTURE_ME_SYSTEM : COMPANION_SYSTEM,
            context: renderUserContext(ctx),
            turns,
          })) {
            reply += text;
            send({ type: "delta", text });
          }
        } else {
          reply = support ? SUPPORT_MESSAGE : conversation.mode === "future-me" ? fallbackFutureMe(ctx) : fallbackCompanionReply(ctx, message);
          send({ type: "delta", text: reply });
        }
      } catch (err) {
        console.error("[chat] stream failed", err);
        if (!reply) {
          reply = "I lost my train of thought for a moment — could you say that again?";
          send({ type: "delta", text: reply });
        }
      }
      const saved = await db.message.create({ data: { conversationId, role: "assistant", content: reply } });
      await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      send({ type: "done", messageId: saved.id });
      controller.close();
      if (aiEnabled()) after(() => learnFromExchange(user.id, message, reply));
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
