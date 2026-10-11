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

## What's in this repository

| Folder | What it is |
| --- | --- |
| `haven/` | **Parent website + device API** (Next.js, Postgres). Everything below |
| `android/` | **Haven Kids for Android/Samsung** (Kotlin). See [`android/README.md`](../android/README.md) |
| `ios/` | **Haven Kids for iPhone** (Swift, Screen Time frameworks). See [`ios/README.md`](../ios/README.md) |

### Website features

- Parent accounts with required two-step sign-in, recovery codes, password reset by email, lockouts
- Families with co-parents and view-only members, invites, roles, and a permanent change history
- Children with age-based starting rules and recorded parent/guardian consent
- Per-weekday daily limits, overnight-safe schedules, app categories and per-app rules
- Web filtering: about 520,000 categorized sites from public block lists, custom block and allow
  lists, SafeSearch/YouTube rewrites, family-safe DNS
- Time requests, alerts by email and urgent text messages, location, data export, account deletion
- Optional Stripe subscriptions. A lapsed subscription never switches protection off
- Error reporting (Sentry), `/api/health`, rate limits on every sign-in and device endpoint

### Owner to-do list

Accounts, keys, legal review, and app-store steps are in
[`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md). Ready-to-paste text for Apple and
Google is in `docs/apple-family-controls-request.md` and `docs/google-play-declarations.md`.

## Getting started

```bash
cd haven
cp .env.example .env          # at least DATABASE_URL, APP_SECRET, CRON_SECRET
npm install
npx prisma migrate deploy
npm run categories:import     # website categories (about 2 minutes, about 75 MB)
npm run dev                   # http://localhost:3000
npm test                      # engine, tamper, two-step, billing, web filter, Stripe signatures
```

Without email, text-message, or Stripe keys, everything still runs locally: emails and texts are
printed to the server log, and billing is off.

## Deploy

Follow section A of [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md). In short: Vercel with
Root Directory `haven`, a Neon database, the environment variables from `.env.example`, and the
GitHub secrets `HAVEN_URL` and `CRON_SECRET` so the 5-minute maintenance workflow runs.

## Data sources

Website categories come from [The Block List Project](https://github.com/blocklistproject/Lists)
(Unlicense) and the [UT1 blacklists](https://dsi.ut-capitole.fr/blacklists/) by Université
Toulouse Capitole (CC BY-SA 4.0), mirrored at github.com/olbat/ut1-blacklists. Keep this
attribution if you redistribute the lists.

## Security notes

- Passwords: bcrypt (cost 12). Sessions: random tokens, stored only as SHA-256 hashes.
- Two-step secrets are encrypted at rest (AES-256-GCM with `APP_SECRET`).
- 5 wrong passwords or codes lock the account for 15 minutes.
- Device tokens and enrollment codes are stored only as hashes. Removing a phone revokes its token.
- Stripe webhooks are verified (HMAC-SHA256 with a 5-minute replay window), and cron calls use a constant-time secret check.
