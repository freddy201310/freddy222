import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

// Server-side refusal fallback: if a request is declined by a safety classifier, the API
// re-runs it on Anthropic's recommended fallback model inside the same call.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

let client: Anthropic | null | undefined;

/** Returns null when no API key is configured — callers then use built-in fallbacks. */
export function anthropic(): Anthropic | null {
  if (client === undefined) client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

export const aiEnabled = () => anthropic() !== null;

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Stream a conversational reply as plain text chunks.
 * `system` is the stable persona prompt; `context` is the per-user memory block.
 */
export async function* streamReply(opts: { system: string; context: string; turns: ChatTurn[] }) {
  const c = anthropic();
  if (!c) throw new Error("AI not configured");
  const stream = c.beta.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: opts.system, cache_control: { type: "ephemeral" } },
      { type: "text", text: `What you know about this person (from their own MindGarden data):\n\n${opts.context}` },
    ],
    messages: opts.turns,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    yield "\n\nI'm not able to help with that one here. If you're going through something hard, reaching out to someone you trust — or a local support line — can really help.";
  }
}

/** One structured-output call. Returns null on any failure so callers can fall back gracefully. */
export async function generateStructured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<S> | null> {
  const c = anthropic();
  if (!c) return null;
  try {
    const res = await c.beta.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      ...FALLBACK,
      output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    return res.parsed_output ?? null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`[ai] API error ${err.status}: ${err.message}`);
    else console.error("[ai] structured call failed", err);
    return null;
  }
}
