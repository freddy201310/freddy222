import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { LetterForm } from "./LetterForm";

export const metadata = { title: "Write a letter" };

export default async function NewLetter() {
  await requireUser();
  return (
    <>
      <PageHeader eyebrow="Letters to Future Me" title="Write a letter" subtitle="What do you want future you to remember, hope for, or celebrate?" />
      <LetterForm />
    </>
  );
}
