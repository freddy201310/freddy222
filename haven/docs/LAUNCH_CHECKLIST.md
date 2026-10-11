# Haven launch checklist (for the owner)

Everything in the code is done. These steps need **you**, because they need your accounts, your
money, your signature, or a human decision. Work top to bottom. Items in the same section can run
in parallel.

## A. Put the website online (about 1 hour)

1. **Merge the code** into `main` on GitHub.
2. **Vercel** (vercel.com): sign up with GitHub → Add New → Project → import `freddy222` →
   set **Root Directory** to `haven` → Deploy. The first deploy fails until step 3 is done.
3. **Database:** in the Vercel project → Storage → Create Database → **Neon** → connect it.
4. **Settings → Environment Variables:**

   | Name | Value |
   | --- | --- |
   | `APP_SECRET` | run `openssl rand -base64 48` and paste the result. **Never change it later** |
   | `CRON_SECRET` | another random string |
   | `APP_URL` | `https://your-domain.com` |
   | `CONTACT_EMAIL` | the address parents can write to |
   | `COMPANY_NAME`, `COMPANY_ADDRESS` | from your LLC paperwork |

5. **Redeploy**, then open `https://<your-app>.vercel.app/api/health`. It should say `"ok": true`.
6. **Website categories:** on your computer, `cd haven`, then
   `DATABASE_URL="<Neon URL>" npm run categories:import`. Or add the GitHub secret in step 8 and
   run the "Haven website categories" workflow by hand.
7. **Domain:** buy one (Vercel → Domains, or any registrar), then Vercel → Settings → Domains → add it.
8. **GitHub → repo Settings → Secrets and variables → Actions**, add:
   - `HAVEN_URL` = `https://your-domain.com`
   - `CRON_SECRET` = the same value as in Vercel
   - `HAVEN_DATABASE_URL` = the Neon connection string (for the weekly category refresh)

   The "Haven maintenance" workflow then runs every 5 minutes for free.
9. **Uptime monitor (free):** UptimeRobot or Better Stack → watch `https://your-domain.com/api/health`.

## B. Email, text messages, errors (about 1 hour)

1. **Resend** (resend.com): add your domain, add the DNS records it shows, create an API key →
   Vercel env `RESEND_API_KEY`, plus `EMAIL_FROM` = `Haven <alerts@your-domain.com>`.
   Without this, password resets and alerts can't be emailed.
2. **Twilio** (twilio.com): buy a number. US numbers need **A2P 10DLC registration** (brand +
   campaign, takes days). Then set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.
3. **Sentry** (sentry.io): create a Next.js project, copy the DSN → `SENTRY_DSN`.
4. Redeploy. Test: Settings → turn on text alerts, then have a test phone press "I need help".

## C. Business and legal (start now; takes weeks)

1. **Form an LLC** in your state (or use a service like Stripe Atlas or LegalZoom). Get an EIN from irs.gov (free).
2. **D-U-N-S number** (free) at dnb.com. It takes 1–2 weeks, and Apple and Google both require it for
   an organization account.
3. **Lawyer review.** Bring them `/privacy`, `/terms`, and this list:
   - COPPA (the amended FTC rule)
   - state children's privacy laws (e.g. California, Utah, Texas app-store/age laws)
   - text-message consent (TCPA)
   - auto-renewal rules for subscriptions

   The pages in the code are drafts written for this product, not legal advice.
4. **Business bank account**, then **Stripe** (stripe.com):
   - Products → create "Haven Family" with a monthly price → copy the price ID to `STRIPE_PRICE_ID`.
   - Developers → API keys → secret key → `STRIPE_SECRET_KEY`.
   - Developers → Webhooks → endpoint `https://your-domain.com/api/stripe/webhook` with events
     `checkout.session.completed` and `customer.subscription.created`, `.updated`, `.deleted`
     → signing secret → `STRIPE_WEBHOOK_SECRET`.
   - Settings → Billing → Customer portal → turn it on.
   - Set `NEXT_PUBLIC_PRICE_LABEL`, e.g. `$7.99 a month`.

   Leave all `STRIPE_*` empty to keep Haven free.
5. **Insurance:** ask about cyber liability and errors & omissions coverage. You hold children's data.

## D. Phone apps (weeks to months)

1. **Apple Developer Program**, organization ($99/yr, needs the D-U-N-S number).
2. **Request the Family Controls entitlement.** Text is ready in `haven/docs/apple-family-controls-request.md`.
3. **On a Mac with Xcode 16+:** `cd ios && brew install xcodegen && xcodegen`, open the project, set
   your Team, and build to a real iPhone. The "iPhone app" GitHub workflow already compiles it on
   every push. Fix anything it reports first.
4. **Google Play Console**, organization ($25 once). Create the app `com.haven.kids`, fill in the
   declarations from `haven/docs/google-play-declarations.md`, and upload a signed release (Android
   Studio → Build → Generate Signed Bundle).
5. Set the website address in `android/app/build.gradle.kts` (`havenServer`) and in
   `ios/project.yml` (`HavenServer`).
6. **Test on real phones:** at least one recent Samsung Galaxy, one older Android, an iPhone in a
   Family Sharing child account, and an iPhone without one.
7. When both apps are live, set `NEXT_PUBLIC_PHONE_APPS_LIVE=true` in Vercel and redeploy.

## E. Before inviting the public

1. **Security review by a third party** (a penetration test). Haven protects children, so get
   someone independent to try to break it.
2. **Beta:** 5–10 families for 2–4 weeks. Watch Sentry and the Alerts page, and ask what confused them.
3. **Support:** a support inbox at `CONTACT_EMAIL`, and a plan for "I lost my phone and my recovery
   codes". That needs identity verification by a human. Haven deliberately has no self-serve bypass.
4. **Backups:** Neon keeps point-in-time history (7 days on free, longer on paid). Upgrade before launch.
