import { db } from "@/lib/db";
import { requireFamily } from "@/lib/family";
import { ActionForm, CodeField } from "@/components/Form";
import { TimeZoneSelect } from "@/components/TimeZoneSelect";
import { InviteForm } from "@/components/InviteForm";
import { changeRole, removeMember, revokeInvite, updateFamily } from "@/actions/family";

export const metadata = { title: "Family" };

const ROLE_LABEL = { OWNER: "Owner", CO_PARENT: "Co-parent", VIEWER: "View only" };

export default async function FamilyPage() {
  const { family, parent, role } = await requireFamily();
  const owner = role === "OWNER";
  const [members, invites] = await Promise.all([
    db.familyMember.findMany({ where: { familyId: family.id }, include: { parent: true }, orderBy: { createdAt: "asc" } }),
    db.invite.findMany({ where: { familyId: family.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Family</h1>
        <p className="hint">Both parents get equal control from their own accounts, even across two households. Grandparents or sitters can be view-only.</p>
      </div>

      <section className="card space-y-3">
        <h2 className="h2">Parents</h2>
        <ul className="divide-y divide-ink-100">
          {members.map((m) => (
            <li key={m.parentId} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{m.parent.name}</span>
                <span className="text-sm text-ink-500">{m.parent.email}</span>
                <span className="pill ml-auto bg-ink-100 text-ink-700">{ROLE_LABEL[m.role]}</span>
              </div>
              {owner && m.parentId !== parent.id && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-semibold text-ink-600">Manage</summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <ActionForm action={changeRole} submit="Change role" variant="soft">
                      <input type="hidden" name="memberId" value={m.parentId} />
                      <select name="role" defaultValue={m.role} className="input" aria-label="Role">
                        <option value="CO_PARENT">Co-parent</option>
                        <option value="VIEWER">View only</option>
                      </select>
                      <CodeField />
                    </ActionForm>
                    <ActionForm action={removeMember} submit="Remove from family" variant="danger">
                      <input type="hidden" name="memberId" value={m.parentId} />
                      <p className="hint">They lose access immediately and are signed out everywhere.</p>
                      <CodeField />
                    </ActionForm>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
        {!owner && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-danger-700">Leave this family</summary>
            <div className="mt-3 max-w-sm">
              <ActionForm action={removeMember} submit="Leave family" variant="danger">
                <input type="hidden" name="memberId" value={parent.id} />
                <CodeField />
              </ActionForm>
            </div>
          </details>
        )}
      </section>

      {owner && (
        <section className="card space-y-4">
          <h2 className="h2">Invite a parent</h2>
          <InviteForm />
          {invites.length > 0 && (
            <ul className="divide-y divide-ink-100 text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2">
                  <span>{i.email} · {ROLE_LABEL[i.role]} · pending</span>
                  <form action={revokeInvite.bind(null, i.id)}><button className="btn-ghost px-2 py-1 text-danger-700">Cancel</button></form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {owner && (
        <section className="card">
          <h2 className="h2">Family settings</h2>
          <div className="mt-3 max-w-md">
            <ActionForm action={updateFamily} submit="Save">
              <div>
                <label className="label" htmlFor="name">Family name</label>
                <input id="name" name="name" defaultValue={family.name} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="timeZone">Home time zone</label>
                <TimeZoneSelect value={family.timeZone} />
                <p className="hint mt-1">Every schedule and daily limit uses this clock.</p>
              </div>
            </ActionForm>
          </div>
        </section>
      )}
    </div>
  );
}
