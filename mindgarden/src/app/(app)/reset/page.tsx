import { requireUser } from "@/lib/auth";
import { Reset } from "./Reset";

export const metadata = { title: "I Need A Reset" };

export default async function ResetPage() {
  await requireUser();
  return <Reset />;
}
