# Haven Kids for iPhone

The phone side of Haven on iOS 16+, built on Apple's Screen Time frameworks: **FamilyControls**,
**ManagedSettings**, and **DeviceActivity**. Apple must grant the Family Controls entitlement
before this can run on real phones or ship to the App Store (see
`haven/docs/apple-family-controls-request.md`).

## Layout

| Path | What it is |
| --- | --- |
| `Sources/HavenCore` | Platform-independent core: API client, policy decoding, tamper-proof `ServerClock`, usage ledger. **Builds and tests on Linux and macOS** (`swift test`) |
| `App/` | SwiftUI app: enter the code, approve Screen Time with the parent's Apple ID, sort apps into categories, turn on the web filter, background check-ins |
| `Shared/` | Used by the app and extensions: App Group storage, applying rules as shields, threshold monitoring, sync, Keychain |
| `Extensions/Monitor` | `DeviceActivityMonitor`: records usage at thresholds, reapplies rules at midnight, checks in, all while the app is closed |
| `Extensions/ShieldConfiguration` | The block screen's text and buttons |
| `Extensions/ShieldAction` | "Ask for 15 more minutes" on the block screen sends a request for that one app |
| `project.yml` | XcodeGen spec: `brew install xcodegen && xcodegen`, then open `HavenKids.xcodeproj` |

## How iPhone differs from Android (Apple's rules, not choices)

- **Apps are opaque.** iOS never tells apps which apps are installed or their names. During setup, a
  parent uses Apple's picker on the child's phone to point out "everything", "always allowed", and
  each category (games, social, …). Website rules then apply to those selections. Per-app rules
  entered on the website by bundle ID can't be matched on iPhone.
- **Usage arrives as totals.** Apple keeps per-app usage inside a sandboxed report that can't send
  data out. Haven measures total and per-category minutes with DeviceActivity threshold events,
  and reports them as `ios:category:<name>` and `ios:other` rows.
- **Check-ins are less frequent.** iOS has no always-running services. Check-ins happen on
  screen-time events, background refresh, location changes, and when the app opens, so the
  server waits at least 4 hours before calling an iPhone "offline".
- **Web filtering** uses Apple's built-in adult-content filter plus the parent's block and allow
  lists (ManagedSettings), and system-wide encrypted DNS to Cloudflare for Families. Category lists
  (gambling, dating, …) and SafeSearch on iPhone would need a Network Extension content filter;
  that's the next step.
- **`.child` authorization** (child account in Family Sharing) means the child can't delete Haven
  or revoke its permission without a parent. With `.individual`, revoking is possible but reported.

## Verified in this repository

- `HavenCore` compiles with Swift 6 on Linux, and its 6 unit tests pass (`swift test`).
- Every Apple-framework file passes Swift's syntax check. They could **not** be type-checked or
  run, because that needs Xcode on a Mac. Expect small fixes on the first Xcode build.
- Not yet tested on a device: the Screen Time pickers, shields, monitor extension timing, and
  whether the shield action extension can reach the network directly. If it can't, requests are
  queued in the App Group and sent at the next check-in.
