import { redirect } from "next/navigation";
import { canEdit, requireFamily } from "@/lib/family";
import { ActionForm } from "@/components/Form";
import { AVATAR } from "@/components/ui";
import { addChild } from "@/actions/children";

export const metadata = { title: "Add a child" };

export default async function NewChild() {
  const { role } = await requireFamily();
  if (!canEdit(role)) redirect("/dashboard");
  const year = new Date().getFullYear();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="h1">Add a child</h1>
      <p className="hint">Haven starts with age-appropriate rules (bedtime, school hours, app and web limits). You can change every one of them.</p>
      <div className="card">
        <ActionForm action={addChild} submit="Add child">
          <div>
            <label className="label" htmlFor="name">First name or nickname</label>
            <input id="name" name="name" className="input" required maxLength={40} />
          </div>
          <div>
            <label className="label" htmlFor="birthYear">Birth year</label>
            <select id="birthYear" name="birthYear" className="input" defaultValue={year - 10}>
              {Array.from({ length: 18 }, (_, i) => year - i).map((y) => <option key={y} value={y}>{y} (age {year - y})</option>)}
            </select>
          </div>
          <fieldset>
            <legend className="label">Color</legend>
            <div className="flex gap-2">
              {Object.entries(AVATAR).map(([c, cls], i) => (
                <label key={c} className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full ${cls} has-[:checked]:ring-2 has-[:checked]:ring-ink-900`}>
                  <input type="radio" name="color" value={c} defaultChecked={i === 0} className="sr-only" />
                  <span className="sr-only">{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
      </div>
    </div>
  );
}
