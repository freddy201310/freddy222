import type { JournalMode } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { JOURNAL_MODES } from "@/lib/journal";
import { PageHeader } from "@/components/PageHeader";
import { JournalEditor } from "./JournalEditor";

export const metadata = { title: "New journal entry" };

export default async function NewEntry({ searchParams }: { searchParams: Promise<{ mode?: string; prompt?: string }> }) {
  await requireUser();
  const { mode, prompt } = await searchParams;
  const m = JOURNAL_MODES.find((x) => x.id === mode)?.id ?? ("DAILY_REFLECTION" as JournalMode);
  return (
    <>
      <PageHeader eyebrow="Journal" title="New entry" />
      <JournalEditor initialMode={m} initialPrompt={prompt?.slice(0, 400)} />
    </>
  );
}
