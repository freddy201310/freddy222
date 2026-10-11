# Haven 🛡️

**Parental controls for iPhone and Samsung, without the loopholes.** One website, used only by
parents, that controls every child's phone, whichever kind it is.

We studied the bypass tricks and complaints for Apple Screen Time, Google Family Link, Qustodio,
Bark, Norton Family, and Net Nanny, then designed Haven around each one. The full list, with
sources, is on the `/why` page (`src/lib/flaws.ts`).

## What's fixed

| Problem in today's apps | What Haven does |
| --- | --- |
| Kids tap "One More Minute" over and over, and it can unlock everything | Extra time goes through a parent, is capped per day, and unlocks only the one app it's for |
| Changing the phone's clock or time zone ends bedtime | Rules run on the server clock in the family's time zone. Clock changes raise an alert |
| Turning off the app's permission, removing a profile, or developer mode (ADB) kills controls | Detected and reported. The phone locks (calls and SOS still work) until a parent reviews it |
| Factory resets go unnoticed | Phones check in every minute. Silence and sudden app-count drops raise alerts |
| VPNs, private DNS, in-app browsers, YouTube guest mode get around web filters | Network-level filtering, VPN and private DNS blocking, Restricted Mode everywhere |
| Settings silently don't sync | Every change has a version the phone must confirm. "Protected" means confirmed |
| iPhone and Samsung families need two different systems | One dashboard and one daily limit shared across all of a child's phones |
| Kids learn the 4-digit passcode | No child logins. Parents need a password **and** an authenticator code. Sensitive changes need a fresh code |
| Co-parents share one login | Separate accounts with roles (owner, co-parent, view only) and a permanent change history |
| Alert floods and false alarms | Block first, alert second. Severity levels, and no repeat alerts within 6 hours |

## What's in this folder

- **Parent website** (Next.js): sign-up with required two-step sign-in and recovery codes;
  family and co-parent invites; children with age-based starting rules; daily limits per weekday;
  overnight-safe schedules (bedtime, school, homework); app categories and per-app rules;
  web filtering; time requests; alerts; location; a full change history.
- **Device API** (`/api/device/*`): what the phone apps use to enroll, check in, ask for time,
  and send SOS. See [`docs/PHONE_APPS.md`](docs/PHONE_APPS.md).
- **Rules engine** (`src/lib/engine.ts`) and **tamper detection** (`src/lib/tamper.ts`), both pure
  and unit-tested.

### Not built yet

The **Haven Kids** apps for iPhone and Android, which do the on-device blocking. A website can't
control a phone by itself: Apple only allows it through its Screen Time frameworks (which need
Apple's Family Controls entitlement), and Android through a device-policy app. The API contract
and the platform plan are in [`docs/PHONE_APPS.md`](docs/PHONE_APPS.md). Until the apps ship,
the dashboard tells parents they're coming soon. Set `NEXT_PUBLIC_PHONE_APPS_LIVE=true` to remove
that notice once they're in the stores.

## Getting started

```bash
cd haven
cp .env.example .env    # set DATABASE_URL, APP_SECRET, CRON_SECRET
npm install
npx prisma migrate deploy
npm run dev             # http://localhost:3000
npm test                # rules engine, tamper detection, two-step codes
```

## Deploy (Vercel)

1. Import this repository on vercel.com and set **Root Directory** to `haven`.
2. Add a Postgres database (Storage → Neon). It sets `DATABASE_URL`.
3. Add `APP_SECRET` (a long random string, e.g. `openssl rand -base64 48`) and `CRON_SECRET`.
4. Deploy. `vercel-build` runs the database migrations.
5. Optional: call `GET /api/cron/offline` with `Authorization: Bearer $CRON_SECRET` every
   5 minutes so offline phones are flagged even when no parent has the dashboard open.

## Security notes

- Passwords: bcrypt (cost 12). Sessions: random tokens, stored only as SHA-256 hashes.
- Two-step secrets are encrypted at rest (AES-256-GCM with `APP_SECRET`).
- 5 wrong passwords or codes lock the account for 15 minutes.
- Device tokens and enrollment codes are stored only as hashes. Removing a phone revokes its token.
