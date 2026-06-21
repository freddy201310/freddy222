// Snapfix editor
(function () {
  'use strict';

  // ---- Constants -----------------------------------------------------------
  const DEFAULT_ADJ = { brightness: 100, contrast: 100, saturate: 100, warmth: 0, blur: 0 };

  // Filter keys must match the enum used by the AI suggestion endpoint.
  const FILTERS = [
    { key: 'none',           label: 'Original', adj: { ...DEFAULT_ADJ } },
    { key: 'warm glow',      label: 'Warm',     adj: { brightness: 108, contrast: 104, saturate: 110, warmth: 45,  blur: 0 } },
    { key: 'bright & crisp', label: 'Bright',   adj: { brightness: 115, contrast: 115, saturate: 108, warmth: 5,   blur: 0 } },
    { key: 'moody',          label: 'Moody',    adj: { brightness: 88,  contrast: 130, saturate: 90,  warmth: -10, blur: 0 }, premium: true },
    { key: 'vivid',          label: 'Vivid',    adj: { brightness: 104, contrast: 118, saturate: 150, warmth: 5,   blur: 0 } },
    { key: 'vintage',        label: 'Vintage',  adj: { brightness: 105, contrast: 92,  saturate: 75,  warmth: 35,  blur: 0 }, premium: true },
    { key: 'cool',           label: 'Cool',     adj: { brightness: 102, contrast: 106, saturate: 104, warmth: -45, blur: 0 } },
  ];

  const SLIDER_BOUNDS = {
    brightness: [0, 200], contrast: [0, 200], saturate: [0, 200], warmth: [-100, 100], blur: [0, 20],
  };

  // ---- State ---------------------------------------------------------------
  const state = {
    img: null,
    adj: { ...DEFAULT_ADJ },
    rotation: 0,
    activeFilter: 'none',
    isPro: false,
    suggestion: null,
  };

  // ---- Elements ------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const dropScreen = $('dropScreen');
  const editorScreen = $('editorScreen');
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const busy = $('busy');
  const busyText = $('busyText');
  const sliders = {
    brightness: $('brightness'), contrast: $('contrast'),
    saturate: $('saturate'), warmth: $('warmth'), blur: $('blur'),
  };
  const filtersEl = $('filters');
  const toastEl = $('toast');
  const paywall = $('paywall');
  const planBadge = $('planBadge');

  // ---- Helpers -------------------------------------------------------------
  function clamp(v, [min, max]) { return Math.max(min, Math.min(max, v)); }

  function showBusy(text) { busyText.textContent = text || 'Working…'; busy.classList.remove('hidden'); }
  function hideBusy() { busy.classList.add('hidden'); }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2600);
  }

  // Shared draw routine — used by the preview, filter thumbnails, and export.
  function drawTo(targetCtx, targetCanvas, image, adj, rotation, scale) {
    scale = scale || 1;
    const rot = ((rotation % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const iw = image.naturalWidth * scale;
    const ih = image.naturalHeight * scale;
    targetCanvas.width = Math.round(swap ? ih : iw);
    targetCanvas.height = Math.round(swap ? iw : ih);

    targetCtx.save();
    targetCtx.filter =
      `brightness(${adj.brightness}%) contrast(${adj.contrast}%) ` +
      `saturate(${adj.saturate}%) blur(${adj.blur * scale}px)`;
    targetCtx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
    targetCtx.rotate((rot * Math.PI) / 180);
    targetCtx.drawImage(image, -iw / 2, -ih / 2, iw, ih);
    targetCtx.restore();

    // Warmth as a soft-light color wash.
    if (adj.warmth) {
      const amt = Math.min(Math.abs(adj.warmth) / 100, 1) * 0.35;
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'soft-light';
      targetCtx.fillStyle = adj.warmth > 0
        ? `rgba(255, 160, 40, ${amt})`
        : `rgba(40, 140, 255, ${amt})`;
      targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
      targetCtx.restore();
    }
  }

  function render() {
    if (!state.img) return;
    drawTo(ctx, canvas, state.img, state.adj, state.rotation, 1);
  }

  function syncSliders() {
    for (const k in sliders) sliders[k].value = state.adj[k];
  }

  function setAdj(partial, filterKey) {
    for (const k in partial) {
      if (k in state.adj) state.adj[k] = clamp(partial[k], SLIDER_BOUNDS[k]);
    }
    if (filterKey !== undefined) setActiveFilter(filterKey);
    syncSliders();
    render();
  }

  function setActiveFilter(key) {
    state.activeFilter = key;
    [...filtersEl.children].forEach((el) =>
      el.classList.toggle('active', el.dataset.key === key));
  }

  // ---- Loading an image ----------------------------------------------------
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast('Please choose an image file.'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      state.img = img;
      state.adj = { ...DEFAULT_ADJ };
      state.rotation = 0;
      state.suggestion = null;
      $('suggestResult').classList.add('hidden');
      buildFilterThumbs();
      setActiveFilter('none');
      syncSliders();
      render();
      dropScreen.classList.add('hidden');
      editorScreen.classList.remove('hidden');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't load that image."); };
    img.src = url;
  }

  // ---- Filter thumbnails ---------------------------------------------------
  function buildFilterThumbs() {
    filtersEl.innerHTML = '';
    FILTERS.forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'filter-thumb';
      wrap.dataset.key = f.key;

      const tc = document.createElement('canvas');
      const tctx = tc.getContext('2d');
      // Render a small thumbnail at the filter's look.
      const scale = Math.min(96 / state.img.naturalWidth, 96 / state.img.naturalHeight, 1);
      drawTo(tctx, tc, state.img, f.adj, 0, scale || 0.1);

      const name = document.createElement('div');
      name.className = 'fname';
      name.textContent = f.label;

      wrap.appendChild(tc);
      wrap.appendChild(name);
      if (f.premium) {
        const lock = document.createElement('div');
        lock.className = 'lock';
        lock.textContent = '🔒';
        wrap.appendChild(lock);
      }
      wrap.addEventListener('click', () => {
        if (f.premium && !state.isPro) { openPaywall('Unlock premium filters with Pro.'); return; }
        setAdj({ ...f.adj }, f.key);
      });
      filtersEl.appendChild(wrap);
    });
  }

  // ---- Auto-enhance --------------------------------------------------------
  function autoEnhance() {
    if (!state.img) return;
    // Sample average luminance from a downscaled copy and nudge exposure/contrast.
    const s = document.createElement('canvas');
    const sctx = s.getContext('2d');
    const scale = Math.min(64 / state.img.naturalWidth, 64 / state.img.naturalHeight, 1);
    s.width = Math.max(1, Math.round(state.img.naturalWidth * scale));
    s.height = Math.max(1, Math.round(state.img.naturalHeight * scale));
    sctx.drawImage(state.img, 0, 0, s.width, s.height);
    const data = sctx.getImageData(0, 0, s.width, s.height).data;
    let sum = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avg = sum / n; // 0..255
    // Push exposure toward a pleasant mid-tone, add a little pop.
    const brightness = clamp(Math.round(100 + (128 - avg) * 0.35), SLIDER_BOUNDS.brightness);
    setAdj({ brightness, contrast: 112, saturate: 112, warmth: 6, blur: 0 }, 'none');
    toast('Auto-enhanced ⚡');
  }

  // ---- Magic Words ---------------------------------------------------------
  function magic(text) {
    if (!state.img) return;
    const t = (text || '').toLowerCase();
    if (!t.trim()) return;
    const adj = { ...DEFAULT_ADJ };
    const has = (...words) => words.some((w) => t.includes(w));

    if (has('bright', 'light', 'sunny')) adj.brightness += 18;
    if (has('dark', 'moody', 'dramatic', 'cinematic')) { adj.brightness -= 15; adj.contrast += 25; }
    if (has('warm', 'sunset', 'golden', 'cozy')) adj.warmth += 45;
    if (has('cool', 'cold', 'blue', 'icy')) adj.warmth -= 45;
    if (has('vivid', 'punchy', 'vibrant', 'pop', 'colorful')) adj.saturate += 45;
    if (has('faded', 'vintage', 'retro', 'muted', 'film')) { adj.saturate -= 25; adj.warmth += 25; adj.contrast -= 8; }
    if (has('soft', 'dreamy', 'blur')) adj.blur += 2;
    if (has('crisp', 'sharp', 'clear', 'punch')) adj.contrast += 18;
    if (has('contrast')) adj.contrast += 20;
    if (has('black and white', 'b&w', 'grayscale', 'monochrome')) adj.saturate = 0;

    setAdj(adj, 'none');
    toast('Applied ✨');
  }

  // ---- AI Suggest ----------------------------------------------------------
  function originalThumbDataUrl(maxEdge) {
    const s = document.createElement('canvas');
    const sctx = s.getContext('2d');
    const scale = Math.min(maxEdge / state.img.naturalWidth, maxEdge / state.img.naturalHeight, 1);
    s.width = Math.max(1, Math.round(state.img.naturalWidth * scale));
    s.height = Math.max(1, Math.round(state.img.naturalHeight * scale));
    sctx.drawImage(state.img, 0, 0, s.width, s.height);
    return s.toDataURL('image/jpeg', 0.85);
  }

  async function aiSuggest() {
    if (!state.img) return;
    showBusy('Asking Snapfix AI…');
    try {
      const dataUrl = originalThumbDataUrl(768);
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503) { toast(data.error || 'AI suggestions are not configured.'); return; }
      if (!res.ok) { toast(data.error || 'AI suggestion failed. Try again.'); return; }

      state.suggestion = data;
      $('suggestSummary').textContent = data.summary || '';
      const reasons = $('suggestReasons');
      reasons.innerHTML = '';
      (data.reasons || []).forEach((r) => {
        const li = document.createElement('li');
        li.textContent = r;
        reasons.appendChild(li);
      });
      $('suggestResult').classList.remove('hidden');
    } catch (err) {
      toast('Network error contacting AI.');
    } finally {
      hideBusy();
    }
  }

  function applySuggestion() {
    const s = state.suggestion;
    if (!s || !s.adjustments) return;
    const a = s.adjustments;
    setAdj({
      brightness: a.brightness,
      contrast: a.contrast,
      saturate: a.saturation, // API uses "saturation"; slider key is "saturate"
      warmth: a.warmth,
      blur: a.blur,
    }, FILTERS.some((f) => f.key === s.filter) ? s.filter : 'none');
    if (s.magic_words) $('magicInput').value = s.magic_words;
    toast('Suggestion applied ✨');
  }

  // ---- Download ------------------------------------------------------------
  function download() {
    if (!state.img) return;
    const out = document.createElement('canvas');
    const octx = out.getContext('2d');
    drawTo(octx, out, state.img, state.adj, state.rotation, 1);

    if (!state.isPro) {
      // Free tier: stamp a small watermark. Pro removes it.
      const pad = Math.round(Math.min(out.width, out.height) * 0.02) + 6;
      const fontSize = Math.round(Math.min(out.width, out.height) * 0.035) + 10;
      octx.font = `700 ${fontSize}px -apple-system, Segoe UI, Roboto, sans-serif`;
      octx.textAlign = 'right';
      octx.textBaseline = 'bottom';
      octx.fillStyle = 'rgba(0,0,0,0.35)';
      octx.fillText('◑ Snapfix', out.width - pad + 1, out.height - pad + 1);
      octx.fillStyle = 'rgba(255,255,255,0.9)';
      octx.fillText('◑ Snapfix', out.width - pad, out.height - pad);
    }

    out.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'snapfix.png';
      a.click();
      URL.revokeObjectURL(url);
      toast(state.isPro ? 'Saved (watermark-free) ⬇' : 'Saved ⬇ — go Pro for no watermark');
    }, 'image/png');
  }

  // ---- Paywall -------------------------------------------------------------
  function openPaywall(reason) {
    if (reason) $('paywallReason').textContent = reason;
    paywall.classList.remove('hidden');
  }
  function closePaywall() { paywall.classList.add('hidden'); }
  function goPro() {
    state.isPro = true;
    planBadge.textContent = 'Pro';
    planBadge.classList.remove('badge-free');
    planBadge.classList.add('badge-pro');
    closePaywall();
    buildFilterThumbs();
    setActiveFilter(state.activeFilter);
    toast('Welcome to Pro 🎉');
  }

  // ---- Events --------------------------------------------------------------
  fileInput.addEventListener('change', (e) => loadFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('drag'); }));
  dropZone.addEventListener('drop', (e) => loadFile(e.dataTransfer.files[0]));

  for (const k in sliders) {
    sliders[k].addEventListener('input', () => {
      state.adj[k] = Number(sliders[k].value);
      render();
    });
  }

  $('autoBtn').addEventListener('click', autoEnhance);
  $('rotateBtn').addEventListener('click', () => { state.rotation = (state.rotation + 90) % 360; render(); });
  $('resetBtn').addEventListener('click', () => { setAdj({ ...DEFAULT_ADJ }, 'none'); $('magicInput').value = ''; });
  $('magicBtn').addEventListener('click', () => magic($('magicInput').value));
  $('magicInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') magic($('magicInput').value); });
  document.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => { $('magicInput').value = c.dataset.magic; magic(c.dataset.magic); }));

  $('suggestBtn').addEventListener('click', aiSuggest);
  $('applySuggestBtn').addEventListener('click', applySuggestion);

  $('downloadBtn').addEventListener('click', download);
  $('newBtn').addEventListener('click', () => {
    editorScreen.classList.add('hidden');
    dropScreen.classList.remove('hidden');
    fileInput.value = '';
  });

  // Pro / paywall
  $('upgradeBtn').addEventListener('click', () => openPaywall('Get everything, no watermark.'));
  $('paywallClose').addEventListener('click', closePaywall);
  $('subscribeBtn').addEventListener('click', goPro);
  document.querySelectorAll('.plan').forEach((p) =>
    p.addEventListener('click', () => {
      document.querySelectorAll('.plan').forEach((x) => x.classList.remove('selected'));
      p.classList.add('selected');
    }));
  document.querySelectorAll('[data-ai]').forEach((b) =>
    b.addEventListener('click', () => openPaywall('AI Pro tools are part of Snapfix Pro.')));
  paywall.addEventListener('click', (e) => { if (e.target === paywall) closePaywall(); });
})();
