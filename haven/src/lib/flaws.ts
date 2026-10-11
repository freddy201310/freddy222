// What we found when we studied today's parental controls, and what Haven does about each.
// Kept in one place so the landing page and the research page never disagree.

export type Flaw = {
  product: string;
  flaw: string;
  fix: string;
  source?: { label: string; url: string };
};

export const FLAWS: Flaw[] = [
  {
    product: "Apple Screen Time",
    flaw: "Kids can keep tapping “One More Minute” when a limit is hit, and a June 2026 report says it can unlock every app, not just the one that ran out.",
    fix: "There is no self-serve extra time. Requests go to a parent, are capped per day, and approved time unlocks only the one app it was asked for.",
    source: { label: "Apple Community, 2026", url: "https://discussions.apple.com/thread/256315580" },
  },
  {
    product: "Screen Time & Family Link",
    flaw: "Changing the phone's date, time, or time zone can end downtime or reset limits.",
    fix: "Every rule runs on Haven's server clock in your home time zone. The phone's clock is ignored, and a changed clock triggers an alert.",
    source: { label: "Bitdefender", url: "https://www.bitdefender.com/en-us/blog/hotforsecurity/family-link-bypass-android-2025" },
  },
  {
    product: "Apple Screen Time",
    flaw: "Assisted Access (iOS 17 and later) could be used to step around Screen Time locks.",
    fix: "Haven reports Assisted Access being turned on and alerts every parent.",
    source: { label: "heise online", url: "https://heise.de/-10250215" },
  },
  {
    product: "Apps built on Screen Time",
    flaw: "Before iOS 26.4, a child could turn off a parental app's Screen Time permission in Settings without the Screen Time passcode.",
    fix: "If Haven's permission is ever revoked, the phone locks (calls still work) and you get a critical alert. Nothing fails silently.",
    source: { label: "TechLockdown", url: "https://www.techlockdown.com/articles/ios26-update-screen-time-protected-app-permissions" },
  },
  {
    product: "Every app",
    flaw: "A factory reset or a new account wipes controls. Parents only notice when usage reports stop or look odd.",
    fix: "Phones check in every minute. Silence becomes an “offline” alert after the window you choose, and a sudden drop in installed apps is flagged as a possible reset.",
    source: { label: "Mobicip", url: "https://www.mobicip.com/blog/bypass-apple-parental-controls" },
  },
  {
    product: "Google Family Link",
    flaw: "Rules are enforced on the phone, so developer options and USB debugging (ADB) tools can strip screen-time limits.",
    fix: "Haven's Android app keeps developer options off. If they're switched on anyway, the phone locks and you're alerted.",
    source: { label: "Bitdefender", url: "https://www.bitdefender.com/en-us/blog/hotforsecurity/family-link-bypass-android-2025" },
  },
  {
    product: "Google Family Link",
    flaw: "Hidden browsers, cloned apps, Secure Folder, and guest viewing on YouTube can get around supervision.",
    fix: "Filtering runs at the network level, including browsers inside apps. YouTube Restricted Mode is enforced signed-in or not, and guest users, Secure Folder, and cloned apps are reported.",
    source: { label: "Bitdefender", url: "https://www.bitdefender.com/en-us/blog/hotforsecurity/family-link-bypass-android-2025" },
  },
  {
    product: "Web filters",
    flaw: "A VPN app or a changed Private DNS setting routes around most web filters.",
    fix: "Unknown VPNs and private DNS changes are blocked and reported. “Proxies & filter-bypass sites” is a blocked category by default.",
    source: { label: "Bitdefender", url: "https://www.bitdefender.com/en-us/blog/hotforsecurity/family-link-bypass-android-2025" },
  },
  {
    product: "Apple Screen Time",
    flaw: "Settings sometimes don't sync to the child's phone, or quietly reset. Parents assume they're protected when they aren't.",
    fix: "Every rule change gets a version number the phone must confirm. Your dashboard shows “Protected” only once a phone has confirmed the latest rules, and alerts you if it doesn't.",
  },
  {
    product: "Qustodio, Norton Family, Net Nanny",
    flaw: "The iPhone versions do much less than the Android versions. Families with both are stuck with two different experiences.",
    fix: "One dashboard and one set of rules for iPhone and Samsung, with the daily limit shared across all of a child's phones. Where Apple allows less, the dashboard says so instead of pretending.",
    source: { label: "Tom's Guide", url: "https://www.tomsguide.com/uk/us/best-parental-control-apps,review-2258.html" },
  },
  {
    product: "Bark and alert-based apps",
    flaw: "Parents complain about false alarms and about alerts arriving after the harm is done.",
    fix: "Haven blocks first and alerts second. Alerts are ranked by severity, and the same alert never repeats more than once every 6 hours per phone.",
    source: { label: "Unstar review analysis, 2026", url: "https://unstar.app/blog/bark-qustodio-aura-net-nanny-mspy-parental-control-apps-ranked-2026" },
  },
  {
    product: "Screen Time passcodes and PINs",
    flaw: "Built-in controls are guarded by a short passcode that kids often learn by watching a parent type it.",
    fix: "Haven has no child login at all. Parents sign in with a password plus a code from an authenticator app, and removing a phone, a child, or a parent needs a fresh code.",
  },
  {
    product: "Most family apps",
    flaw: "Co-parents share one login, so nobody knows who changed a rule, and a second household can't be added cleanly.",
    fix: "Every parent has their own account with a role (owner, co-parent, view only), and a permanent history shows who changed what and when.",
  },
];

/** Limits that come from Apple and Google themselves. No app can remove these, and we say so. */
export const PLATFORM_LIMITS = [
  "On iPhone, apps can only enforce rules through Apple's Screen Time (Family Controls) framework. Haven uses it, so some things Apple doesn't expose — like reading message content — aren't possible, and Haven doesn't try.",
  "On both platforms, a determined teenager with physical access and enough time can reset a phone. Haven can't stop that, but it makes sure you find out within the window you choose.",
  "Location and usage are only as fresh as the phone's last check-in. Haven always shows how old the information is.",
];
