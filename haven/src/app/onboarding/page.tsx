import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/Form";
import { TimeZoneSelect } from "@/components/TimeZoneSelect";
import { createFamily } from "@/actions/family";

export const metadata = { title: "Set up your family" };

export default async function OnboardingPage() {
  const { parent } = await requireParent();
  if (await db.familyMember.findFirst({ where: { parentId: parent.id } })) redirect("/dashboard");
  return (
    <AuthShell title="Set up your family" subtitle="Rules follow this time zone. Changing the time zone on a child's phone won't change anything.">
      <ActionForm action={createFamily} submit="Continue">
        <div>
          <label className="label" htmlFor="name">Family name</label>
          <input id="name" name="name" className="input" placeholder={`The ${parent.name.split(" ").at(-1)} family`} required />
        </div>
        <div>
          <label className="label" htmlFor="timeZone">Home time zone</label>
          <TimeZoneSelect />
        </div>
      </ActionForm>
    </AuthShell>
  );
}
