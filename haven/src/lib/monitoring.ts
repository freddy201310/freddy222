
// Sends server errors to Sentry through its envelope API when SENTRY_DSN is set.
// No SDK: one small request per error, with no request bodies, cookies, or user data attached.

type Dsn = { endpoint: string; key: string };

export function parseDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const project = u.pathname.replace(/^\//, "");
    if (!u.username || !project) return null;
    return { endpoint: `${u.protocol}//${u.host}/api/${project}/envelope/`, key: u.username };
  } catch {
    return null;
  }
}

export async function captureError(error: unknown, context: { path?: string; method?: string; kind?: string } = {}) {
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (!dsn) return;
  const err = error instanceof Error ? error : new Error(String(error));
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tags: { path: context.path, method: context.method, kind: context.kind },
    exception: { values: [{ type: err.name, value: err.message, stacktrace: { frames: stackFrames(err.stack) } }] },
  };
  const envelope = [JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
  await fetch(dsn.endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-sentry-envelope", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=haven/1.0` },
    body: envelope,
  }).catch(() => undefined);
}

function stackFrames(stack = "") {
  return stack
    .split("\n")
    .slice(1, 30)
    .map((line) => {
      const m = line.match(/at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/);
      return m ? { function: m[1] ?? "?", filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) } : { function: line.trim() };
    })
    .reverse();
}
