"use client";

import { useState, useTransition } from "react";
import type { FormState } from "@/actions/auth";
import { saveRules } from "@/actions/children";
import type { Rules } from "@/lib/rules";

/** Save a slice of a child's rules and track the result for <Message>. */
export function useSave(childId: string) {
  const [state, setState] = useState<FormState>(undefined);
  const [pending, start] = useTransition();
  const save = (patch: Partial<Rules>) => start(async () => setState(await saveRules(childId, patch)));
  return { state, pending, save };
}
