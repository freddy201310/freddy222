# Haven Kids phone apps: device contract

The website is the only place rules are made. On each child's phone, a small **Haven Kids** app
enforces them. This document is the contract between the two. Phone apps are not built yet.
Until they ship, the dashboard says so wherever a parent connects a phone.

## Principles

1. **The phone never decides.** It reports raw facts (usage, signals). The server returns what is
   allowed, computed on the server clock in the family's time zone.
2. **The phone can't change rules.** A device token can only enroll, check in, ask for time, and
   press SOS. No rule-writing endpoint exists for devices.
3. **Fail closed, but never trap a child.** If the app loses its permissions, the phone locks.
   Phone calls, emergency services, and the SOS button always work.
4. **Silence is a signal.** If a phone stops checking in, parents are told.

## API

All bodies are JSON. After enrollment, send `Authorization: Bearer <deviceToken>`.

### `POST /api/device/enroll`

```json
{ "code": "ABCD-2345", "platform": "IOS", "name": "Ava's iPhone", "model": "iPhone 16", "osVersion": "iOS 26.5" }
```

Returns `{ deviceId, deviceToken, childName }`. Codes are single-use, platform-specific, and
expire after 30 minutes. Store `deviceToken` in the Keychain (iOS) or Keystore (Android).

### `POST /api/device/heartbeat` (about every 60 seconds, and on every unlock)

```json
{
  "appliedPolicyVersion": 3,
  "deviceTime": "2026-10-14T20:00:00-04:00",
  "battery": 64,
  "osVersion": "iOS 26.5",
  "signals": {
    "timeZone": "America/New_York",
    "developerOptions": false, "usbDebugging": false,
    "vpnActive": false, "privateDns": false,
    "controlsPermissionRevoked": false, "profileRemoved": false,
    "secondaryUser": false, "assistedAccess": false, "safeMode": false,
    "appCount": 61
  },
  "location": { "latitude": 40.71, "longitude": -74.0 },
  "usage": [{ "appId": "com.roblox.robloxmobile", "appName": "Roblox", "category": "games", "minutes": 25 }]
}
```

`usage` is minutes **today** per app. The server only lets usage go up within a day.

The response holds everything needed until the next check-in:

| Field | Meaning |
| --- | --- |
| `serverTime` | Keep time from this plus a monotonic clock, never the wall clock |
| `policyVersion` | Apply `rules`, then report this number as `appliedPolicyVersion` |
| `state.mode` | `open`, `schedule`, `limit`, `paused`, or `tamper` |
| `rules` | The full rule set (see `src/lib/rules.ts`) |
| `apps` / `categories` | `{ allowed, reason, remaining }` per known app and per category |
| `grants` | Approved bonus time, each scoped to one `appId` (`*` = overall) |

### `POST /api/device/requests` / `GET /api/device/requests`

Ask for more time for one app: `{ appId, appName, minutes, reason }`. The server enforces the
parent's per-day cap, the per-request maximum, and one pending request at a time. `GET` lists
today's requests so the phone can show the answer.

### `POST /api/device/sos`

`{ latitude?, longitude? }`. Sends a critical alert to every parent. Must work in every mode.

## iPhone (Swift, iOS 16+)

- **Enforcement:** Apple's Screen Time frameworks: `FamilyControls` (authorization with
  `.individual` or the parent's approval via `.child`), `ManagedSettings` (shields for apps,
  categories, and web domains), and `DeviceActivity` (usage thresholds and schedules).
  Requires Apple's Family Controls entitlement, which Apple grants on request.
- **Web filter:** a `NEFilterDataProvider` content filter, or `ManagedSettings` web domain
  shields, plus SafeSearch and YouTube Restricted Mode through DNS.
- **Tamper signals:** `controlsPermissionRevoked` when `AuthorizationCenter.shared.authorizationStatus`
  leaves `.approved`; `profileRemoved` when the filter or VPN configuration disappears;
  `assistedAccess` when detectable. Ask the parent to protect the app with the Screen Time passcode
  and to turn on "Protect App Permissions" (iOS 26.4+).
- **Limits:** Apple gives apps opaque tokens instead of bundle IDs for some selections, so app
  names in reports may come from `DeviceActivityReport` extensions.

## Samsung / Android (Kotlin, Android 10+)

- **Enforcement:** run as a Device Policy Controller (device owner on a fresh phone via QR
  provisioning, or the Android Management API). This allows `setApplicationHidden`,
  `setPackagesSuspended`, `addUserRestriction` (no factory reset, no safe boot, no adding users,
  no developer options, no VPN configuration), and blocking uninstall of Haven itself.
- **Usage:** `UsageStatsManager` for per-app minutes; categories from `ApplicationInfo.category`
  plus a server-side lookup.
- **Web filter:** an always-on local `VpnService` with lockdown, forcing DNS through Haven's
  filter and dropping DNS-over-HTTPS endpoints. Set `private_dns_mode` off as device owner.
- **Samsung specifics:** turn off Secure Folder and Dual Messenger (app cloning) with Knox or
  user restrictions, and report them as `secondaryUser` if they appear.
- **Tamper signals:** `developerOptions` and `usbDebugging` from `Settings.Global`,
  `vpnActive` for any VPN that isn't Haven's, `safeMode` from `PackageManager.isSafeMode()`,
  and `appCount` from the installed package list.
