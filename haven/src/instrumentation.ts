import type { Instrumentation } from "next";

export function register() {}

// Next.js calls this for every uncaught server error (pages, server actions, route handlers).
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureError } = await import("./lib/monitoring");
  await captureError(error, { path: request.path, method: request.method, kind: context.routeType });
};
