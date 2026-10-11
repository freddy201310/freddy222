import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const s = site();
  return (
    <LegalPage title="Terms of Service" effective={s.effectiveDate}>
      <p>These terms are an agreement between you and {s.company} (“Haven”, “we”) for your use of Haven. By creating an account you agree to them.</p>

      <h2>Who can use Haven</h2>
      <ul>
        <li>You must be at least 18 and the parent or legal guardian of every child you add.</li>
        <li>You may only connect phones that you own or have the legal right to manage for a child in your care.</li>
        <li>Haven is not for monitoring adults, partners, employees, or anyone without the legal authority to do so. We'll close accounts used that way.</li>
      </ul>

      <h2>Your account</h2>
      <p>
        Keep your password, authenticator app, and recovery codes safe and away from your children. You're responsible for everything done with
        your account, including by co-parents you invite. Tell us right away at <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a> if you think
        someone else got in.
      </p>

      <h2>What Haven can and can't do</h2>
      <p>
        Haven helps you supervise, but no parental control is perfect. Apple and Google limit what any app can do, and a determined person with a
        phone in hand may find a way around controls or reset the phone. Haven is designed to tell you when that happens, but it isn't a substitute
        for talking with your kids and supervising them. Haven is not an emergency service — in an emergency, call your local emergency number.
      </p>

      <h2>Subscriptions</h2>
      <ul>
        <li>New families get a free trial. After it ends, a subscription is needed to connect new phones; phones already connected stay protected.</li>
        <li>Subscriptions renew automatically until cancelled. You can cancel any time from the Billing page, effective at the end of the current period.</li>
        <li>Prices and taxes are shown before you pay. We'll give at least 30 days' notice of any price change.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don't misuse Haven: no attempts to break its security, access other families' data, overload the service, or reverse-engineer the phone apps to defeat protections.</p>

      <h2>Your data</h2>
      <p>Your family's information belongs to you. How we handle it is described in the <Link href="/privacy">Privacy Policy</Link>. You can download or delete it at any time.</p>

      <h2>Ending the service</h2>
      <p>You can delete your account at any time from Settings. We may suspend or close accounts that break these terms, and will tell you why unless the law prevents it.</p>

      <h2>Disclaimers and limits</h2>
      <p>
        Haven is provided “as is”. To the extent the law allows, we disclaim implied warranties, and our total liability for any claim relating to
        Haven is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer
        protection laws that can't be waived.
      </p>

      <h2>Changes</h2>
      <p>We'll email you before material changes take effect. Continuing to use Haven after that means you accept the new terms.</p>

      <h2>Contact</h2>
      <p><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>{s.mailingAddress && <> · {s.mailingAddress}</>}</p>
    </LegalPage>
  );
}
