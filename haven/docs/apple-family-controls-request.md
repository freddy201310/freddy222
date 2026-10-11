# Apple Family Controls entitlement request

Apple has to approve the **Family Controls (Distribution)** entitlement before Haven Kids can be
installed from TestFlight or the App Store. Development builds on your own devices work without it.

**Where:** sign in at developer.apple.com → Account → the Family Controls request form
(search "Family Controls entitlement request" on developer.apple.com if the link moves).
**Who:** the Account Holder of your *organization* developer account.
**Submit one request per bundle ID:** `com.haven.kids`, `com.haven.kids.monitor`,
`com.haven.kids.shieldconfig`, `com.haven.kids.shieldaction`.

---

## Ready-to-paste answers

**App name:** Haven Kids

**Describe your app and how it uses the Family Controls framework:**

> Haven is a parental-controls service. Parents manage rules on the Haven website; Haven Kids is
> installed on the child's iPhone and enforces them using Apple's Screen Time frameworks.
>
> - **FamilyControls:** requests `.child` authorization (approved with the parent's Apple ID through
>   Family Sharing) and shows `FamilyActivityPicker` so the parent can choose which apps are always
>   allowed and which belong to each category the parent sets limits for.
> - **ManagedSettings:** applies shields during bedtime/school schedules, when the daily limit is
>   used up, or when the parent pauses the phone. It also applies the web-content filter, prevents
>   removal of the app, and requires automatic date and time so the child can't move the clock to
>   end downtime.
> - **DeviceActivity:** a daily schedule with usage thresholds, so limits apply on time even when
>   the app isn't running. The monitor extension only records minute counts per category.
> - **ManagedSettingsUI:** a shield configuration and action extension that lets the child ask for
>   more time for that one app. The request goes to the parent, who approves or denies it.
>
> Haven never reads message content, screen content, or browsing history. Usage leaves the device
> only as minute totals per category. App identities stay as Apple's opaque tokens on the device.
> Children never have an account. The parent account is protected by two-step sign-in.

**Who is the intended audience?** Parents and legal guardians of children under 18.

**Is your app a parental-controls app?** Yes.

**Privacy policy URL:** https://YOUR-DOMAIN/privacy

**Website:** https://YOUR-DOMAIN

---

Tips:

- Approval usually takes days to weeks, and Apple may ask follow-up questions. Answer them from
  this page.
- Make sure the privacy policy page is live before you apply.
- Each extension also needs the App Group `group.com.haven.kids` and the Family Controls capability
  turned on in its App ID.
