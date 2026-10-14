# Haven launch checklist (for the owner)

Everything in the code is done. These steps need **you**, because they need your accounts, your
money, your signature, or a human decision. Work top to bottom. Items in the same section can run
in parallel.

## A. Put the website online with Render (about 20 minutes, about $13 a month)

1. Open the repository on GitHub and click the **Deploy to Render** button in `README.md`.
   (Or go to render.com → **New → Blueprint** → pick `freddy222`.)
2. **Sign in with GitHub** and allow Render to see the `freddy222` repository.
3. Render reads `render.yaml` and shows two things to create: **haven** (the website) and
   **haven-db** (the database). Type your support email for `CONTACT_EMAIL`, then click **Apply**.
   Render generates `APP_SECRET` and `CRON_SECRET` for you.
4. Add a payment card when asked. The website ("Starter", about $7/month) stays awake 24/7,
   which children's phones need. The database ("Basic 256 MB", about $6/month) keeps your data.
5. Wait for the first deploy to finish (about 5 minutes). Your address looks like
   `https://haven-xxxx.onrender.com`. Check `https://haven-xxxx.onrender.com/api/health`: it
   should say `"ok": true`.
6. **Turn on the background jobs.** On GitHub, open `freddy222` → **Settings → Secrets and
   variables → Actions → New repository secret**, and add:
   - `HAVEN_URL` = your Render address
   - `CRON_SECRET` = in Render, open **haven → Environment**, reveal `CRON_SECRET`, and copy it
   - `HAVEN_DATABASE_URL` = in Render, open **haven-db → Connect → External Database URL**
7. **Load website categories:** on GitHub → **Actions → Haven website categories → Run workflow**.
8. **Try it:** open your address, create your parent account, and set up two-step sign-in.
   Save the recovery codes.
9. **Your own domain (optional):** Render → **haven → Settings → Custom Domains**. Add the DNS
   records it shows at your registrar, then add `APP_URL` = `https://your-domain.com` under
   **Environment**, and update `HAVEN_URL` on GitHub.
10. **Uptime monitor (free):** UptimeRobot or Better Stack → watch `/api/health`.

From now on, every change merged into `main` on GitHub redeploys automatically.

<details>
<summary>Alternative: Vercel + Neon</summary>

On vercel.com, import `freddy222` with **Root Directory** `haven`, add a Neon database
under Storage, and set `APP_SECRET`, `CRON_SECRET`, `APP_URL` and `CONTACT_EMAIL` under
Settings → Environment Variables. Then redeploy and do steps 6–10 above.
</details>

## B. Email, text messages, errors (about 1 hour)

1. **Resend** (resend.com): add your domain, add the DNS records it shows, create an API key →
   `RESEND_API_KEY` (Render: haven → Environment), plus `EMAIL_FROM` = `Haven <alerts@your-domain.com>`.
   Without this, password resets and alerts can't be emailed.
2. **Twilio** (twilio.com): buy a number. US numbers need **A2P 10DLC registration** (brand +
   campaign, takes days). Then set (in Render's Environment tab) `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.
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
7. When both apps are live, set `NEXT_PUBLIC_PHONE_APPS_LIVE=true` in Render's Environment tab and redeploy.

## E. Before inviting the public

1. **Security review by a third party** (a penetration test). Haven protects children, so get
   someone independent to try to break it.
2. **Beta:** 5–10 families for 2–4 weeks. Watch Sentry and the Alerts page, and ask what confused them.
3. **Support:** a support inbox at `CONTACT_EMAIL`, and a plan for "I lost my phone and my recovery
   codes". That needs identity verification by a human. Haven deliberately has no self-serve bypass.
4. **Backups:** Neon keeps point-in-time history (7 days on free, longer on paid). Upgrade before launch.
