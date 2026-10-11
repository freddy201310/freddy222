// Procedural ambient soundscapes with the Web Audio API — no audio files to download or host.

type Stopper = () => void;

function noiseBuffer(ctx: AudioContext, kind: "white" | "pink" | "brown", seconds = 4) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") data[i] = w * 0.5;
      else if (kind === "brown") { last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; }
      else { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; data[i] = (b0 + b1 + b2 + w * 0.05) * 0.8; }
    }
  }
  return buf;
}

function loopNoise(ctx: AudioContext, kind: "white" | "pink" | "brown") {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind);
  src.loop = true;
  return src;
}

function lfo(ctx: AudioContext, freq: number, depth: number, target: AudioParam) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.value = depth;
  osc.connect(gain).connect(target);
  osc.start();
  return osc;
}

function ambience(ctx: AudioContext, out: AudioNode, sound: string): Stopper {
  const nodes: (AudioScheduledSourceNode)[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;

  if (sound === "rain") {
    const n = loopNoise(ctx, "pink");
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 800;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.value = 0.35;
    n.connect(hp).connect(lp).connect(g).connect(out); n.start(); nodes.push(n);
  } else if (sound === "waves") {
    const n = loopNoise(ctx, "brown");
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0.25;
    nodes.push(lfo(ctx, 0.09, 0.22, g.gain), lfo(ctx, 0.09, 500, lp.frequency));
    n.connect(lp).connect(g).connect(out); n.start(); nodes.push(n);
  } else if (sound === "wind") {
    const n = loopNoise(ctx, "pink");
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0.3;
    nodes.push(lfo(ctx, 0.05, 300, bp.frequency), lfo(ctx, 0.13, 0.12, g.gain));
    n.connect(bp).connect(g).connect(out); n.start(); nodes.push(n);
  } else if (sound === "brook") {
    const n = loopNoise(ctx, "white");
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2500; bp.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.value = 0.18;
    nodes.push(lfo(ctx, 3.1, 900, bp.frequency), lfo(ctx, 0.7, 400, bp.frequency));
    n.connect(bp).connect(g).connect(out); n.start(); nodes.push(n);
  } else if (sound === "fire") {
    const n = loopNoise(ctx, "brown");
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
    const g = ctx.createGain(); g.gain.value = 0.35;
    n.connect(lp).connect(g).connect(out); n.start(); nodes.push(n);
    const crackleBuf = noiseBuffer(ctx, "white", 0.05);
    timer = setInterval(() => {
      if (Math.random() > 0.55) return;
      const c = ctx.createBufferSource(); c.buffer = crackleBuf;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1500 + Math.random() * 3000;
      const cg = ctx.createGain(); const t = ctx.currentTime;
      cg.gain.setValueAtTime(0.25 * Math.random(), t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      c.connect(hp).connect(cg).connect(out); c.start(t); c.stop(t + 0.05);
    }, 90);
  }
  return () => { clearInterval(timer); nodes.forEach((x) => { try { x.stop(); } catch {} }); };
}

function music(ctx: AudioContext, out: AudioNode, kind: string): Stopper {
  const nodes: AudioScheduledSourceNode[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  if (kind === "drone") {
    // A soft major-seventh pad that slowly breathes.
    [130.81, 196.0, 246.94, 329.63].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.035;
      nodes.push(lfo(ctx, 0.05 + i * 0.017, 0.025, g.gain), lfo(ctx, 0.1 + i * 0.03, 1.2, o.frequency));
      o.connect(g).connect(out); o.start(); nodes.push(o);
    });
  } else if (kind === "chimes") {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    timer = setInterval(() => {
      if (Math.random() > 0.45) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = scale[Math.floor(Math.random() * scale.length)];
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g).connect(out); o.start(t); o.stop(t + 3.6);
    }, 700);
  }
  return () => { clearInterval(timer); nodes.forEach((x) => { try { x.stop(); } catch {} }); };
}

export class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stops: Stopper[] = [];

  start(sound: string, musicKind: string, volume: number) {
    this.stop();
    if (sound === "none" && musicKind === "none") return;
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 1.5);
    this.master.connect(this.ctx.destination);
    if (sound !== "none") this.stops.push(ambience(this.ctx, this.master, sound));
    if (musicKind !== "none") this.stops.push(music(this.ctx, this.master, musicKind));
  }

  setVolume(v: number) {
    if (this.ctx && this.master) this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.2);
  }

  stop() {
    this.stops.forEach((s) => s());
    this.stops = [];
    this.master?.disconnect();
    this.master = null;
  }

  close() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
