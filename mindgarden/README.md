# MindGarden 🌱

**A companion that helps you better understand yourself and become the person you want to be.**

MindGarden is a personal growth, reflection, and wellness companion: "the AI that learns how to help you."
It is *not* therapy, a diagnostic tool, a medical service, or a crisis service.

## Features

| Area | What it does |
| --- | --- |
| **Personal Companion** (`/companion`) | Streaming reflective chat. It draws on your Life Manual, Future Me profile, recent check-ins, and how you've rated past replies (Loved it / Helpful / Not helpful / Doesn't fit me). After each exchange it pulls durable facts you shared (goals, what helps, stressors) into your manual. |
| **Personal Life Manual** (`/manual`) | Your living profile: goals, values, motivators, stressors, habits, helpful activities, mood lifters, focus helpers, setback patterns, wins, and insights. Everything can be edited. It also shows patterns found in your own data (e.g. mood on days you journal vs. days you don't). |
| **My Happy Place** (`/happy-place`) | An animated sanctuary: 6 places (garden, beach, forest, cabin, mountain, fantasy), 6 light palettes, weather effects, ambient sounds and music generated in the browser with the Web Audio API (no audio files), a pet, and decorations. Inside: relax, guided breathing, mindfulness sessions, journaling, and goal review. |
| **Future Me** (`/future-me`) | Describe who you want to become, then ask "What would Future Me tell me right now?" Replies are grounded in your own goals and values. |
| **Letters to Future Me** (`/letters`) | Write to your future self, goals, or milestones. Letters stay sealed until they're delivered in 1 month, 6 months, 1 year, or on a custom date. |
| **I Need A Reset** (`/reset`) | A short personal plan (breathing, prompt, movement, puzzle, a favorite activity, one tiny next step). Your "did this help?" answers feed back into the manual. |
| **Daily encouragement** (dashboard) | A thought of the day, a reflection question, an encouragement, and a small challenge, generated once per day from your interests, goals, and recent activity. |
| **Journal** (`/journal`) | Brain dump, gratitude, daily reflection, goal tracking, and personal growth modes. One-line summaries per entry, plus pattern insights across recent entries. |
| **Mood & Energy** (`/mood`) | Daily check-in for mood, energy, stress, focus, and sleep. A trend chart for each, plus a table view and a 7/30/90-day range. |
| **Private by design** (`/settings`, `/privacy`) | Export everything as JSON, toggle whether the companion learns, clear any data category, change your password, or delete your account (cascades to all data). |

The app also includes care rails: system prompts that rule out diagnosis and clinical language, a support message (988 / findahelpline.com) for urgent language whether or not AI is on, and refusal handling.

## Tech stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS · PostgreSQL · Prisma · cookie-session auth (bcrypt, hashed session tokens) · Claude API via `@anthropic-ai/sdk`

AI calls use `claude-opus-5-5` with streaming for chat and structured outputs (Zod) for extraction, daily cards, reset plans, and journal insights. Server-side refusal fallback (`fallbacks: "default"`) is enabled.
**Without `ANTHROPIC_API_KEY` the app still works fully:** it switches to built-in, personalized offline responses.

## Getting started

```bash
cd mindgarden
cp .env.example .env          # set DATABASE_URL, optionally ANTHROPIC_API_KEY and CRON_SECRET
npm install
npx prisma db push            # create tables
npm run dev                   # http://localhost:3000
```

Production: `npm run build && npm start`.

## Deploy from GitHub (Vercel)

1. On vercel.com, choose **Add New → Project** and import this repository.
2. Set **Root Directory** to `mindgarden`, then deploy. The first build will fail because there's no database yet.
3. In the project, open **Storage → Create Database → Neon (Postgres)** and connect it. This sets `DATABASE_URL` automatically.
4. Optionally add `ANTHROPIC_API_KEY` and `CRON_SECRET` under **Settings → Environment Variables**.
5. **Deployments → Redeploy**. The `vercel-build` script creates the database tables (`prisma migrate deploy`) and then builds the site.

### Letter delivery

Due letters are delivered whenever their owner opens the app. To deliver on schedule (for example, to add email notifications later in `src/lib/letters.ts`), call this hourly:

```
GET /api/cron/deliver-letters
Authorization: Bearer $CRON_SECRET
```

## Project layout

```
prisma/schema.prisma          data model (all user data cascades on account deletion)
src/lib/ai.ts                 Claude client: streaming replies + structured outputs
src/lib/prompts.ts            companion / Future Me / extractor / daily / reset / journal prompts
src/lib/memory.ts             builds the "what I know about you" context; remember() dedupes + strengthens entries
src/lib/learn.ts              extracts Life Manual entries from conversations
src/lib/insights.ts           pattern discovery from check-ins and activity
src/lib/fallbacks.ts          offline content when AI isn't configured
src/app/(app)/…               signed-in pages
src/app/api/…                 chat stream, ratings, export, cron
src/components/happy-place/   scene renderer + Web Audio soundscapes
```
