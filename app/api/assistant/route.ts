import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL, SYSTEM_PROMPTS, isMode } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { mode, input } = (body ?? {}) as { mode?: unknown; input?: unknown };

  if (!isMode(mode)) {
    return Response.json(
      { error: "mode must be one of: plan, guide, explain." },
      { status: 400 },
    );
  }
  if (typeof input !== "string" || input.trim().length === 0) {
    return Response.json({ error: "input is required." }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: MODEL,
          max_tokens: 8000,
          // Adaptive thinking is the recommended mode for Opus 4.8. The
          // installed SDK's static types predate it, so cast the value — it is
          // the correct shape on the wire.
          thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
          system: SYSTEM_PROMPTS[mode],
          messages: [{ role: "user", content: input }],
        });

        messageStream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });

        await messageStream.finalMessage();
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        controller.enqueue(encoder.encode(`\n\n⚠️ Error: ${message}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
