import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const s = site();
  return (
    <LegalPage title="Privacy Policy" effective={s.effectiveDate}>
      <p>
        {s.company} (“Haven”, “we”) gives parents tools to manage their children's phones. Because those tools involve information about
        children, we collect as little as we can, use it only to provide the controls a parent sets up, and never sell it or use it for
        advertising. This policy explains what we collect, why, and the choices parents have.
      </p>

      <h2>Who uses Haven</h2>
      <p>
        Only adults who are a child's parent or legal guardian may create a Haven account. Children never create accounts or sign in.
        The Haven Kids app on a child's phone is installed and connected by a parent, using a one-time code from the parent's account.
      </p>

      <h2>Information about parents</h2>
      <ul>
        <li>Name, email address, and (if you turn on text alerts) mobile number.</li>
        <li>Your password, stored only as a one-way hash, and your two-step sign-in secret, stored encrypted.</li>
        <li>Your settings, the rules you set, and a history of changes made by each parent in your family.</li>
        <li>Basic sign-in records (browser type and time) so you can see where you're signed in.</li>
        <li>If you subscribe, our payment processor (Stripe) handles your card. We never see or store full card numbers.</li>
      </ul>

      <h2>Information about children</h2>
      <p>We collect only what's needed to apply the rules you choose and to tell you when something needs attention:</p>
      <ul>
        <li><strong>The child's first name or nickname and birth year</strong>, entered by you, to set age-appropriate defaults.</li>
        <li><strong>App usage:</strong> which apps were used and for how many minutes each day, to enforce time limits.</li>
        <li><strong>Website checks:</strong> the website addresses (domain names) the phone asks to open, checked against your filter. We don't store browsing history; we keep only the result of blocked attempts for your alerts.</li>
        <li><strong>Location:</strong> the phone's most recent location, if you leave location sharing on (you can turn it off for each child), so you can see where your child's phone is. Pressing “I need help” always shares location. We keep only the latest location, not a location history.</li>
        <li><strong>Device information:</strong> phone model, operating-system version, battery level, and settings that affect protection (for example, whether developer options or a VPN are on).</li>
        <li><strong>Requests and help button:</strong> when your child asks for more time or presses “I need help”, including any short reason they type.</li>
      </ul>
      <p>
        We do <strong>not</strong> collect the content of your child's messages, calls, photos, emails, or the text they type, and we
        don't track them across other companies' apps or websites.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To enforce the rules you set and show you what's happening on your child's phones.</li>
        <li>To send you alerts by email or text message, according to your settings.</li>
        <li>To keep accounts secure, prevent abuse, and fix problems.</li>
        <li>To meet legal obligations.</li>
      </ul>
      <p>We never sell or rent personal information, never use children's information for advertising, and never build marketing profiles of children.</p>

      <h2>Parental consent and rights (COPPA)</h2>
      <p>
        Before any information about a child is collected, the parent account holder confirms they are the child's parent or legal
        guardian and consents to the collection described here. At any time, a parent can:
      </p>
      <ul>
        <li>See the information we hold about their child in the dashboard.</li>
        <li>Download all of their family's information from <Link href="/settings">Settings</Link> → “Download my family's data”.</li>
        <li>Stop further collection by removing a phone, or delete a child and all of their information.</li>
        <li>Delete their account. If they own the family, this deletes the whole family's information.</li>
        <li>Contact us at <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a> with any request or question.</li>
      </ul>

      <h2>Who we share information with</h2>
      <p>
        Only service providers that help us run Haven, under contracts that limit their use of the data to providing their service to us:
        hosting and database (for example Vercel and Neon), email delivery (Resend), text messages (Twilio), payments (Stripe), and error
        monitoring (Sentry). Every parent in your family can see your family's information. We disclose information to authorities only
        when required by law or to protect someone's safety.
      </p>

      <h2>How long we keep information</h2>
      <ul>
        <li>Daily app-usage totals: 90 days.</li>
        <li>Alerts: 1 year after they are read.</li>
        <li>Location: only the most recent location is kept.</li>
        <li>Everything else: until you delete it or delete your account. Backups are overwritten within 30 days.</li>
      </ul>

      <h2>Security</h2>
      <p>
        All traffic is encrypted. Parent accounts require two-step sign-in. Passwords are hashed, sign-in secrets are encrypted, and phone
        connection tokens are stored only as hashes. Access to production systems is limited to staff who need it.
      </p>

      <h2>Changes</h2>
      <p>If we make a material change to how we handle children's information, we'll email parents and ask for consent again before the change applies.</p>

      <h2>Contact</h2>
      <p>
        {s.company}
        {s.mailingAddress && <>, {s.mailingAddress}</>}
        <br />
        <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
      </p>
    </LegalPage>
  );
}
