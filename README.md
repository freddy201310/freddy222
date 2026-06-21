# Snapfix

**Photo editing, stupidly simple.** Upload a photo, let AI suggest the perfect look, and apply it in one tap. No layers, no jargon.

This repo contains:

- **Landing page** (`index.html`) with a **waitlist** that saves emails to Google Sheets.
- **Editor** (`editor.html` + `js/app.js`) — auto-enhance, sliders, filters, "Magic Words", and
  **AI Suggest** (Claude vision recommends edits you can apply in one click).
- A small **Node + Express** server (`server.js`) so the Anthropic API key and the Sheets URL
  stay server-side.

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the two values below
npm start                 # → http://localhost:3000
```

The app runs without any keys — the landing page and the full editor (everything except AI
Suggest) work immediately. Add the two env vars to unlock the waitlist and AI.

## Configuration (`.env`)

| Variable                   | What it does                                         |
| -------------------------- | ---------------------------------------------------- |
| `ANTHROPIC_API_KEY`        | Enables **AI Suggest** (Claude vision). Get one at <https://console.anthropic.com/>. |
| `GOOGLE_SHEETS_WEBHOOK_URL`| Where waitlist signups are saved (see below).        |
| `PORT`                     | Server port (default `3000`).                        |

## Waitlist (Google Sheets) — 2-minute setup

1. Create a new Google Sheet. Rename the first tab to **`Waitlist`**.
2. **Extensions → Apps Script**, paste this and Save:

   ```js
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Waitlist');
     const data = JSON.parse(e.postData.contents);
     sheet.appendRow([new Date(), data.email]);
     return ContentService
       .createTextOutput(JSON.stringify({ ok: true }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

3. **Deploy → New deployment → Web app**. Set *Execute as: Me* and *Who has access: Anyone*.
4. Copy the **Web app URL** and put it in `.env` as `GOOGLE_SHEETS_WEBHOOK_URL`.

Now waitlist signups append a `timestamp, email` row to your Sheet. The server validates the
email and rate-limits before forwarding, so the raw URL is never exposed to browsers.

## How AI Suggest works

The editor sends a downscaled (~768px) JPEG of the uploaded photo to `POST /api/suggest`. The
server asks Claude (`claude-opus-4-8`, vision) for a **structured** recommendation — slider
values, a filter, a "Magic Words" phrase, and short reasons — using JSON-schema structured
outputs so the result maps directly onto the editor's controls. Tap **Apply** to use it.

If `ANTHROPIC_API_KEY` is unset, the editor shows a friendly "not configured" message and
everything else keeps working.

## Project layout

```
index.html          Landing page + waitlist
editor.html         The editor app
css/styles.css      Editor styles
css/landing.css     Landing styles
js/landing.js       Waitlist form
js/app.js           Editor logic + AI Suggest
server.js           Express server (static + /api/waitlist + /api/suggest)
manifest.webmanifest, icons/icon.svg   PWA bits
```

## Notes

- The **Pro** paywall (premium filters, watermark-free export, mock "Pro tools") is a UI demo —
  wire up Stripe to charge for real.
- Free exports get a small `◑ Snapfix` watermark; "going Pro" in the UI removes it for the session.
