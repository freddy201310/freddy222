// Snapfix server — serves the static site and exposes two API routes:
//   POST /api/waitlist  → forwards the email to a Google Apps Script Web App (Sheet)
//   POST /api/suggest   → asks Claude (vision) to recommend edits for an uploaded photo
//
// The Anthropic API key and the Google webhook URL stay server-side. Configure them
// in a .env file (see .env.example) or your host's environment variables.

const path = require('path');
const fs = require('fs');
const express = require('express');

// Minimal .env loader (no dependency) — only sets vars that aren't already set.
(function loadDotenv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let [, key, val] = m;
      val = val.replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (_) { /* ignore */ }
})();

const PORT = process.env.PORT || 3000;
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-opus-4-8';

const app = express();
app.use(express.json({ limit: '10mb' })); // base64 thumbnails fit comfortably under 10mb
app.use(express.static(__dirname));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Tiny in-memory rate limiter (per IP) ---------------------------------
const hits = new Map();
function rateLimit(ip, max, windowMs) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
  rec.count += 1;
  hits.set(ip, rec);
  return rec.count <= max;
}

// Remember locally-seen emails so we can report "already on the list" even if the
// Sheet itself doesn't dedupe. (The Sheet is the source of truth for storage.)
const seenEmails = new Set();

// ---- Waitlist -------------------------------------------------------------
app.post('/api/waitlist', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!rateLimit('wl:' + ip, 10, 60_000)) {
    return res.status(429).json({ error: 'Too many requests.' });
  }

  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const duplicate = seenEmails.has(email);
  seenEmails.add(email);

  if (!GOOGLE_SHEETS_WEBHOOK_URL) {
    // Not configured yet — accept the signup so the UI works, but warn in the log.
    console.warn('[waitlist] GOOGLE_SHEETS_WEBHOOK_URL not set; signup not persisted:', email);
    return res.json({ ok: true, duplicate, persisted: false });
  }

  try {
    const r = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ts: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error('Sheet webhook returned ' + r.status);
    return res.json({ ok: true, duplicate, persisted: true });
  } catch (err) {
    console.error('[waitlist] failed to persist:', err.message);
    return res.status(502).json({ error: 'Could not save your signup. Please try again.' });
  }
});

// ---- AI edit suggestions --------------------------------------------------
const FILTER_ENUM = ['none', 'warm glow', 'bright & crisp', 'moody', 'vivid', 'vintage', 'cool'];

const SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    adjustments: {
      type: 'object',
      additionalProperties: false,
      properties: {
        brightness: { type: 'integer' }, // 0–200 (100 = unchanged)
        contrast: { type: 'integer' },   // 0–200
        saturation: { type: 'integer' }, // 0–200
        warmth: { type: 'integer' },     // -100..100
        blur: { type: 'integer' },       // 0–20
      },
      required: ['brightness', 'contrast', 'saturation', 'warmth', 'blur'],
    },
    filter: { type: 'string', enum: FILTER_ENUM },
    magic_words: { type: 'string' },
    reasons: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'adjustments', 'filter', 'magic_words', 'reasons'],
};

const SUGGEST_PROMPT =
  'You are Snapfix, a friendly photo-editing assistant for people with no editing skills. ' +
  'Look at this photo and recommend edits that would make it look its best. Respond with the ' +
  'JSON object only.\n\n' +
  'Editing controls (match these exactly):\n' +
  '- brightness, contrast, saturation: 0–200 where 100 = unchanged.\n' +
  '- warmth: -100 (cool/blue) to 100 (warm/orange), 0 = unchanged.\n' +
  '- blur: 0–20 pixels (use 0 unless a soft/dreamy look genuinely helps).\n' +
  '- filter: one of ' + FILTER_ENUM.map((f) => '"' + f + '"').join(', ') + '.\n' +
  '- magic_words: a short natural-language phrase describing the look (e.g. "warm sunset glow, brighter").\n' +
  'Keep adjustments tasteful and realistic — small, flattering changes beat extreme ones. ' +
  'summary: one friendly sentence. reasons: 2–4 short bullet points explaining the choices.';

let anthropic = null;
if (ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl || '');
  if (!m) return null;
  let mediaType = m[1].toLowerCase();
  if (mediaType === 'image/jpg') mediaType = 'image/jpeg';
  return { mediaType, data: m[2] };
}

app.post('/api/suggest', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({ error: 'AI suggestions are not configured (no ANTHROPIC_API_KEY).' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!rateLimit('ai:' + ip, 20, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — give it a moment.' });
  }

  const parsed = parseDataUrl(req.body && req.body.image);
  if (!parsed) return res.status(400).json({ error: 'A base64 image data URL is required.' });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: SUGGESTION_SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.data } },
          { type: 'text', text: SUGGEST_PROMPT },
        ],
      }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: "The AI couldn't suggest edits for this image." });
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return res.status(502).json({ error: 'Empty AI response.' });

    let suggestion;
    try {
      suggestion = JSON.parse(textBlock.text);
    } catch (_) {
      return res.status(502).json({ error: 'Could not parse the AI response.' });
    }
    return res.json(suggestion);
  } catch (err) {
    console.error('[suggest] error:', err.status || '', err.message);
    return res.status(502).json({ error: 'AI request failed. Please try again.' });
  }
});

// SPA-friendly fallback for the two HTML entry points is unnecessary (static serves them).
app.listen(PORT, () => {
  console.log(`Snapfix running at http://localhost:${PORT}`);
  if (!ANTHROPIC_API_KEY) console.log('  • AI Suggest disabled (set ANTHROPIC_API_KEY to enable).');
  if (!GOOGLE_SHEETS_WEBHOOK_URL) console.log('  • Waitlist not persisted (set GOOGLE_SHEETS_WEBHOOK_URL to enable).');
});
