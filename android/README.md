# Haven Kids for Android (Samsung and other Android phones)

The phone side of Haven. It enforces the rules parents set on the Haven website. Written in
Kotlin using only the Android framework: no AndroidX, no third-party libraries.

## What it does

| Feature | How |
| --- | --- |
| Check-ins every minute | `HavenService`, a foreground service that restarts on boot (`BootReceiver`) |
| Clock-proof timing | `ServerClock` uses the server's time plus `SystemClock.elapsedRealtime()` |
| Usage per app | `UsageCollector` (UsageStatsManager), counted in the family's time zone |
| Blocking apps | Device owner: `DevicePolicyManager.setPackagesSuspended`. Otherwise `BlockerService` (accessibility) opens `BlockActivity` |
| Block screen | `BlockActivity`: ask for 15/30 more minutes of *that app*, call someone, "I need help" (SOS with location) |
| Web filter | `FilterVpnService`, a DNS-only VPN: SafeSearch/YouTube rewrites, parent block/allow lists, category checks via `/api/device/web-check`, Cloudflare for Families upstream, encrypted-DNS hosts blocked, hard-coded public DNS captured |
| Tamper signals | `Signals`: developer options, USB debugging, foreign VPN, Private DNS, permissions revoked, extra users, safe mode, app count |
| Lockdown (device owner) | No factory reset, safe boot, new users, debugging, date/time changes, unknown sources, Private DNS, or VPN changes. Haven can't be uninstalled, and the always-on VPN uses lockdown |
| Token safety | Device token encrypted with an Android Keystore key (`Store`) |

## Two ways to install

1. **Strongest: device owner.** Reset the phone, tap the welcome screen 6 times, and scan a
   provisioning QR code. Haven then controls the phone like a school or work device. Build the QR
   payload once the APK is hosted:
   ```json
   {
     "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.haven.kids/.AdminReceiver",
     "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://YOUR-DOMAIN/haven-kids.apk",
     "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "<base64url SHA-256 of the signing certificate>",
     "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false
   }
   ```
2. **Standard: from Google Play.** Install, enter the code, then grant usage access, device admin,
   accessibility, VPN and location from the in-app checklist. Turning any of them off is reported
   and locks the phone.

## Build

Open this folder in Android Studio (Ladybug or newer), or run `./gradlew assembleRelease`.
Set your website address in `app/build.gradle.kts` (`havenServer`).

### Verified in this repository

A full APK can't be built in the environment this was written in, because Google's SDK download
server was unreachable. Instead, every Kotlin file was compiled against the real Android 14
`android.jar`, with zero errors and zero warnings. The DNS/packet code has JVM unit tests:

```bash
gradle -p android/typecheck build -PandroidJar=$ANDROID_HOME/platforms/android-34/android.jar
```

Still needs a real device test: device-owner provisioning, the accessibility blocker, and the VPN
filter on Samsung One UI (Secure Folder and Dual Messenger behavior in particular).
