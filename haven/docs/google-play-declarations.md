# Google Play: permission declarations and Data safety

Haven Kids uses sensitive Android permissions. Google Play reviews each one, so submit these
declarations in Play Console → App content. Text is ready to paste. Replace YOUR-DOMAIN.

Also consider distributing the strongest version (device owner, set up from a QR code on a freshly
reset phone) as a direct APK download from your site. QR provisioning requires a direct download
link, and that version doesn't need the accessibility service at all.

## Category and audience

- **App category:** Parenting.
- **Target audience:** choose **18 and over**. The app is installed and configured by a parent, and
  children never sign in. (The app runs on a child's device, but Google's Families policy applies
  to apps *directed at* children. Disclose the parental-control purpose clearly in the listing.)
- **Store listing must say** it's a parental-control app that monitors and limits the device it's
  installed on, and that it shows a persistent notification while active.

## Accessibility API (`BlockerService`)

> Haven Kids is a parental-control app. A parent installs it on their child's phone. The
> accessibility service detects which app is in the foreground, only its package name, so that apps
> can be paused when the parent's screen-time rules say so. It does not read screen content
> (`canRetrieveWindowContent=false`), text, or any user input. The parent and child are told about
> this during setup. The service is only used on phones where Haven isn't the device owner.

Upload a short video: setup → enabling the service → an app being paused at the limit.

## VpnService (`FilterVpnService`)

> Haven Kids uses VpnService only to filter DNS lookups on the child's device, so the parent's
> website rules (blocked sites, SafeSearch, YouTube Restricted Mode) apply in every browser. Only
> DNS traffic is routed through the VPN, and no other traffic is captured, logged, or redirected.
> Domain lookups aren't stored. Parental control is a permitted core use of VpnService.

## Device administrator (`AdminReceiver`)

> Used so the child can't remove Haven Kids without the parent knowing. If device admin is turned
> off, the parent is alerted.

## Usage access (`PACKAGE_USAGE_STATS`)

> Counts minutes per app each day to enforce the parent's daily and per-app time limits. Shown to the
> parent on their dashboard.

## QUERY_ALL_PACKAGES

> Parental controls must see which apps are installed so rules (block, limit, always allow) can be
> applied to each app the child can open. This is a permitted use under "device management /
> parental control".

## Background location (`ACCESS_BACKGROUND_LOCATION`)

> Lets parents see the child's phone's latest location. The parent can turn this off per child.
> Only the latest location is kept. A prominent disclosure is shown before the permission prompt.

## Foreground service type `specialUse`

> Subtype: "Parental controls: enforces screen-time rules set by the parent." The service must run
> continuously to check in with the parent's rules and apply them on time.

---

## Data safety form

| Data type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Approximate and precise location | Yes | No | App functionality (shown to the parent) | Yes, the parent can turn it off |
| App interactions (which apps are used and for how long) | Yes | No | App functionality | No |
| Installed apps | Yes | No | App functionality | No |
| Device or other IDs (a random device token) | Yes | No | App functionality, security | No |
| Web browsing (domain names checked against the filter) | Processed, not stored | No | App functionality | No |

- Data is encrypted in transit: **Yes**.
- Users can request data deletion: **Yes** (the parent deletes the child or the account on the website).
- Committed to the Families Policy: answer per Google's form for parental-control apps.
