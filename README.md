# StudyFlow

Your AI study coach — three tools in one place, powered by Claude:

1. **🗓️ Plan my time** — describe your deadlines and free time, get a realistic,
   prioritized study schedule with time-management tips.
2. **📒 Make a study guide** — give a topic or paste your notes, get an
   exam-ready guide with key concepts, facts, a worked example, and self-test
   questions.
3. **💡 Explain a concept** — stuck on something? Get it explained with an
   analogy, step-by-step build-up, and a check-yourself question.

Built with **Next.js (App Router)** + **TypeScript** + **Tailwind CSS**, with
streaming responses from the **Claude API** (`claude-opus-4-8`, adaptive
thinking).

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Add your Anthropic API key
cp .env.example .env.local
# then edit .env.local and paste your key

# 3. Run the dev server
npm run dev
```

Open http://localhost:3000.

Get an API key at https://console.anthropic.com/.

## How it works

- The UI (`app/page.tsx`) has three modes that share one input box and one
  streamed output panel.
- All three call a single streaming endpoint, `app/api/assistant/route.ts`,
  with a `mode` flag.
- Each mode uses a tailored system prompt defined in `lib/anthropic.ts`.
- Responses stream token-by-token and render via a tiny dependency-free
  Markdown renderer (`components/Markdown.tsx`).

## Configuration

- **Model** — change `MODEL` in `lib/anthropic.ts`. Default is
  `claude-opus-4-8`; switch to `claude-sonnet-4-6` for lower cost.
- **Prompts** — tune `SYSTEM_PROMPTS` in `lib/anthropic.ts` to adjust tone,
  structure, or grade level.

## Deploy

Deploys cleanly to any Node host (Vercel, etc.). Set `ANTHROPIC_API_KEY` as an
environment variable in your hosting dashboard.

## Project structure

```
app/
  api/assistant/route.ts   # streaming Claude endpoint (mode-aware)
  layout.tsx               # root layout + metadata
  page.tsx                 # the integrated 3-mode UI
  globals.css              # styles + Markdown typography
components/
  Markdown.tsx             # minimal Markdown -> HTML renderer
lib/
  anthropic.ts             # Claude client, model, and per-mode system prompts
```

## Roadmap ideas

- Accounts + saved plans and guides
- Calendar export (.ics) for study schedules
- Upload a PDF/syllabus and generate a guide from it (Files API)
- Spaced-repetition reminders
