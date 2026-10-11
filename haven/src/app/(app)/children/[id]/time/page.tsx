import { canEdit, loadChild, requireFamily } from "@/lib/family";
import { TimeEditor } from "@/components/editors/TimeEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { family, role } = await requireFamily();
  const child = await loadChild(family.id, id);
  return <TimeEditor childId={child.id} rules={child.rules} readOnly={!canEdit(role)} />;
}
