import { loadChild, requireFamily } from "@/lib/family";
import { ageOf } from "@/lib/rules";
import { Avatar } from "@/components/ui";
import { ChildTabs } from "@/components/ChildTabs";

export default async function ChildLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { family } = await requireFamily();
  const child = await loadChild(family.id, id);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={child.name} color={child.color} size="lg" />
        <div>
          <h1 className="h1">{child.name}</h1>
          <p className="hint">Age {ageOf(child.birthYear)} · rules version {child.policy?.version ?? 1}</p>
        </div>
      </div>
      <ChildTabs id={child.id} />
      {children}
    </div>
  );
}
