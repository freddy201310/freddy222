import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/tokens";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/Form";
import { acceptInvite } from "@/actions/family";

export const metadata = { title: "Join a family" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { tokenHash: sha256(token) }, include: { family: true } });
  if (!invite || invite.expiresAt < new Date()) {
    return <AuthShell title="Invite expired" subtitle="Ask the family owner to send a new link."><Link href="/" className="btn-soft">Home</Link></AuthShell>;
  }
  const session = await getSession();
  const here = `/invite/${token}`;
  const role = invite.role === "VIEWER" ? "a view-only member" : "a co-parent";
  if (!session || !session.mfaPassed) {
    return (
      <AuthShell title={`Join ${invite.family.name}`} subtitle={`You've been invited as ${role}. Sign in or create an account with ${invite.email} to accept.`}>
        <div className="flex gap-3">
          <Link href={`/signup?next=${encodeURIComponent(here)}`} className="btn-primary flex-1">Create account</Link>
          <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn-soft flex-1">Sign in</Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={`Join ${invite.family.name}`} subtitle={`You'll join as ${role}.`}>
      <ActionForm action={acceptInvite} submit="Accept invite">
        <input type="hidden" name="token" value={token} />
      </ActionForm>
    </AuthShell>
  );
}
