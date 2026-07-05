// =====================================================================
// SMILEY SOUNDS — synthesized via Web Audio (no external assets)
// Exposed as window.__sfx
// =====================================================================
(function () {
  let ctx = null;
  let master = null;
  let muted = false;
  let smileyVoiceMuted = false; // silence incidental smiley chatter (saga phase 2+)
  let unlocked = false;
  let ambientGain = null;

  function ensureCtx() {
    if (ctx) return ctx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.95 * masterVol;
    // Limiter so we can run loud without harsh clipping
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -8; comp.knee.value = 22; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    master.connect(comp).connect(ctx.destination);
    return ctx;
  }

  function unlock() {
    ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!unlocked) {
      unlocked = true;
      // tiny silent ping to fully open the audio graph on iOS
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      o.connect(g).connect(dest());
      o.start(); o.stop(ctx.currentTime + 0.02);
    }
  }

  // Auto-unlock on first user gesture
  ['pointerdown','keydown','touchstart','click'].forEach(ev =>
    window.addEventListener(ev, unlock, { once: false, passive: true })
  );

  function now() { return ctx.currentTime; }

  // ---------- MIXER — named buses over the master ----------
  // squirrels / seals (animal calls), voices (generic babble), music,
  // combat (fight SFX), world (everything else). narrator is virtual (TTS).
  let masterVol = 1;
  let outBus = null; // transient routing target while a tagged sound schedules
  const chanState = {
    squirrels: { vol: 1, muted: false, node: null },
    seals:     { vol: 1, muted: false, node: null },
    voices:    { vol: 1, muted: false, node: null },
    narrator:  { vol: 1, muted: false, node: null },
    music:     { vol: 1, muted: false, node: null },
    combat:    { vol: 1, muted: false, node: null },
    world:     { vol: 1, muted: false, node: null }
  };
  function chan(name) {
    const st = chanState[name] || chanState.world;
    if (!st.node && ctx) {
      st.node = ctx.createGain();
      st.node.gain.value = st.muted ? 0 : st.vol;
      st.node.connect(master);
    }
    return st.node || master;
  }
  function dest() { return outBus || chan('world'); }
  function withChannel(name, fn) {
    return function () {
      const prev = outBus; outBus = ensureCtx() ? chan(name) : null;
      try { return fn.apply(this, arguments); } finally { outBus = prev; }
    };
  }
  function onBus(name, fn) { const prev = outBus; outBus = chan(name); try { fn(); } finally { outBus = prev; } }
  function setChannel(name, o = {}) {
    const st = chanState[name]; if (!st) return;
    if (o.vol != null) st.vol = Math.max(0, Math.min(2, +o.vol));
    if (o.muted != null) st.muted = !!o.muted;
    if (st.node && ctx) st.node.gain.setTargetAtTime(st.muted ? 0 : st.vol, ctx.currentTime, 0.03);
  }
  function getMixer() {
    const out = { master: { vol: masterVol, muted: muted }, channels: {} };
    Object.keys(chanState).forEach(k => { out.channels[k] = { vol: chanState[k].vol, muted: chanState[k].muted }; });
    return out;
  }
  function setMasterVolume(v) {
    masterVol = Math.max(0, Math.min(2, +v));
    if (master && !muted && ctx) master.gain.setTargetAtTime(0.95 * masterVol, ctx.currentTime, 0.03);
  }

  // ---------- helpers ----------
  function envGain(t0, attack, hold, release, peak=1) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.setValueAtTime(peak, t0 + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
    return g;
  }

  function tone(freq, dur=0.18, type='sine', peak=0.4, t0=null) {
    if (!ensureCtx() || muted) return;
    t0 = t0 || now();
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = envGain(t0, 0.005, dur*0.4, dur*0.6, peak);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur=0.2, peak=0.3, filterFreq=2000, t0=null) {
    if (!ensureCtx() || muted) return;
    t0 = t0 || now();
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0;i<len;i++) data[i] = (Math.random()*2-1) * (1 - i/len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=filterFreq;
    const g = envGain(t0, 0.002, dur*0.2, dur*0.8, peak);
    src.connect(filt).connect(g).connect(dest());
    src.start(t0);
  }

  // ---------- minion babble ----------
  // simulate a vocal-tract sound: glottal saw + 2 formant bandpasses + small vibrato + pitch glide
  function babble(opts={}) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const dur = opts.dur || (0.22 + Math.random()*0.28);
    const baseFreq = opts.freq || (180 + Math.random()*140); // 180..320
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(baseFreq, t0);
    // pitch glide for "papoy!" feel
    const glide = (Math.random() < 0.5 ? 1 : -1) * (40 + Math.random()*120);
    o.frequency.linearRampToValueAtTime(Math.max(80, baseFreq + glide), t0 + dur*0.7);
    o.frequency.linearRampToValueAtTime(baseFreq + glide*0.3, t0 + dur);

    // tiny vibrato
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6 + Math.random()*4;
    const lfoG = ctx.createGain(); lfoG.gain.value = 6 + Math.random()*4;
    lfo.connect(lfoG).connect(o.frequency);
    lfo.start(t0); lfo.stop(t0 + dur + 0.05);

    // formants — choose vowel-ish pair
    const vowels = [
      [700, 1100],  // ah
      [400,  800],  // oh
      [350, 2100],  // ee
      [600, 1400],  // eh
      [300,  900],  // oo
    ];
    const [F1, F2] = vowels[Math.floor(Math.random()*vowels.length)];

    const f1 = ctx.createBiquadFilter(); f1.type='bandpass'; f1.frequency.value=F1; f1.Q.value=8;
    const f2 = ctx.createBiquadFilter(); f2.type='bandpass'; f2.frequency.value=F2; f2.Q.value=10;
    const mix = ctx.createGain(); mix.gain.value = 1.0;

    const env = envGain(t0, 0.02, dur*0.4, dur*0.6, opts.peak || 0.45);

    o.connect(f1).connect(mix);
    o.connect(f2).connect(mix);
    mix.connect(env).connect(chan('voices'));

    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function babbleWord(numSyllables=null) {
    const n = numSyllables || (1 + Math.floor(Math.random()*3));
    let t = 0;
    for (let i=0;i<n;i++) {
      setTimeout(() => babble({ dur: 0.16 + Math.random()*0.18 }), t);
      t += 130 + Math.random()*120;
    }
  }

  // =====================================================================
  // ANIMALESE-STYLE VOICE SYNTH (à la Animal Crossing / Undertale)
  // Each letter → a short synthesized phoneme blip, played in rapid
  // succession with slight overlap. Vowels = formant tones (open mouth),
  // consonants = clicks / noise bursts. Per-character pitch + speed give
  // each class its own voice. Subtitles carry the real meaning.
  // =====================================================================

  // Per-voice character: base frequency (Hz), speed, formant scaling, and a
  // soft sub-octave "weight" for big voices (sine — adds body without buzz).
  const VOICE_PROFILES = {
    narrator: { base: 160, speed: 1.05, formant: 1.0,  vol: 1.0,  jitter: 0.05, weight: 0.16 },
    god:      { base: 116, speed: 1.1,  formant: 0.86, vol: 1.0,  jitter: 0.04, weight: 0.30 },
    giant:    { base: 104, speed: 1.05, formant: 0.82, vol: 1.0,  jitter: 0.05, weight: 0.32 },
    wizard:   { base: 150, speed: 1.0,  formant: 0.95, vol: 0.95, jitter: 0.05, weight: 0.18 },
    samurai:  { base: 162, speed: 0.98, formant: 1.0,  vol: 1.0,  jitter: 0.05, weight: 0.14 },
    armored:  { base: 134, speed: 1.0,  formant: 0.9,  vol: 1.0,  jitter: 0.05, weight: 0.22 },
    healer:   { base: 248, speed: 0.92, formant: 1.14, vol: 0.9,  jitter: 0.06, weight: 0.05 },
    water:    { base: 208, speed: 0.95, formant: 1.06, vol: 0.9,  jitter: 0.06, weight: 0.06 },
    gunner:   { base: 156, speed: 1.02, formant: 0.96, vol: 0.95, jitter: 0.06, weight: 0.14 },
    spear:    { base: 176, speed: 0.98, formant: 1.0,  vol: 0.95, jitter: 0.05, weight: 0.12 },
    time:     { base: 224, speed: 0.9,  formant: 1.08, vol: 0.9,  jitter: 0.06, weight: 0.06 },
    flying:   { base: 278, speed: 0.86, formant: 1.18, vol: 0.88, jitter: 0.07, weight: 0.04 },
    villager: { base: 194, speed: 0.95, formant: 1.04, vol: 0.9,  jitter: 0.06, weight: 0.06 },
    child1:   { base: 298, speed: 0.86, formant: 1.22, vol: 0.86, jitter: 0.07, weight: 0.03 },
    child2:   { base: 336, speed: 0.82, formant: 1.28, vol: 0.86, jitter: 0.08, weight: 0.03 }
  };

  // Vowel formant pairs (F1, F2) in Hz — gives each vowel its open "shape"
  const VOWEL_FORMANTS = {
    a: [800, 1300], e: [560, 1900], i: [330, 2300],
    o: [560, 920],  u: [350, 800],  y: [400, 1700]
  };
  const VOWELS = 'aeiouy';
  // Consonants that are noisy/fricative (s, f, sh, etc.) vs voiced stops
  const FRICATIVES = 'sfzhxc';
  const NASALS = 'mn';

  // Subtitle callback so the host can show captions in sync with the voice
  let subtitleCb = null;
  function setSubtitleCallback(fn) { subtitleCb = fn; }

  // Track active voice nodes so stopSpeech() can cut them off
  let voiceNodes = [];
  let voiceToken = 0;

  // Dedicated voice bus: a gentle low-pass tames any fizz so the voice
  // reads as warm + bubbly (not a harsh electrical buzz).
  let voiceBus = null;
  function getVoiceBus() {
    if (voiceBus) return voiceBus;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.85;
    lp.connect(g).connect(chan('voices'));
    voiceBus = lp;
    return voiceBus;
  }

  // Soft, click-free envelope: tiny linear attack, exponential-ish release
  function softEnv(t0, dur, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.014);
    g.gain.setTargetAtTime(0.0, t0 + dur * 0.45, dur * 0.22);
    return g;
  }

  // Play a single vowel blip — triangle glottal source through LOW-Q formants
  // (rounded, not resonant) + a touch of dry tone for warmth.
  function vowelBlip(letter, t0, dur, prof, freq, peak) {
    const bus = getVoiceBus();
    const src = ctx.createOscillator();
    src.type = 'triangle';
    src.frequency.setValueAtTime(freq, t0);
    src.frequency.linearRampToValueAtTime(freq * (1 + (Math.random()-0.5)*0.03), t0 + dur);

    const [F1, F2] = VOWEL_FORMANTS[letter] || VOWEL_FORMANTS.a;
    const f1 = ctx.createBiquadFilter(); f1.type='bandpass'; f1.frequency.value=F1*prof.formant; f1.Q.value=3;
    const f2 = ctx.createBiquadFilter(); f2.type='bandpass'; f2.frequency.value=F2*prof.formant; f2.Q.value=4;
    const mix = ctx.createGain(); mix.gain.value = 0.85;
    const dry = ctx.createGain(); dry.gain.value = 0.28;
    const g = softEnv(t0, dur, peak);

    src.connect(f1).connect(mix);
    src.connect(f2).connect(mix);
    src.connect(dry).connect(mix);
    mix.connect(g).connect(bus);

    // soft sub-octave body for big/deep voices (sine = smooth, no buzz)
    if (prof.weight > 0.10) {
      const sub = ctx.createOscillator(); sub.type='sine';
      sub.frequency.value = freq*0.5;
      const sg = softEnv(t0, dur, peak*prof.weight*1.3);
      sub.connect(sg).connect(bus);
      sub.start(t0); sub.stop(t0 + dur + 0.05);
      voiceNodes.push(sub, sg);
    }
    src.start(t0); src.stop(t0 + dur + 0.05);
    voiceNodes.push(src, g, f1, f2, mix, dry);
  }

  // Play a consonant blip — short + soft, rounded (no clicky electrical artifacts)
  function consBlip(letter, t0, dur, prof, freq, peak) {
    const bus = getVoiceBus();
    if (FRICATIVES.includes(letter)) {
      // soft breath — quiet, gently band-passed noise
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2200; bp.Q.value=0.8;
      const g = softEnv(t0, dur, peak*0.32);
      s.connect(bp).connect(g).connect(bus);
      s.start(t0); voiceNodes.push(s, g, bp);
    } else {
      // soft rounded tone for stops + nasals — triangle, gentle
      const o = ctx.createOscillator(); o.type='triangle';
      o.frequency.setValueAtTime(freq * (NASALS.includes(letter) ? 0.85 : 0.95), t0);
      const g = softEnv(t0, dur, peak*0.6);
      o.connect(g).connect(bus);
      o.start(t0); o.stop(t0 + dur + 0.05); voiceNodes.push(o, g);
    }
  }

  // =====================================================================
  // REAL ANIMAL VOICES — squirrel chitter + seal bark
  // Installed per-page via setVoiceSpecies({ profileKey: 'sq'|'sl' }) so the
  // same profile keys keep their Animalese voices in other worlds.
  // =====================================================================
  let voiceSpecies = {};
  function setVoiceSpecies(map) { voiceSpecies = map || {}; }

  // Tunable animal-voice character — the Sound Studio sliders sit on these.
  const animalTune = {
    sq: { pitch: 1, speed: 1, trill: 1, length: 1 },
    sl: { pitch: 1, speed: 1, gravel: 1, boom: 1, length: 1 }
  };
  function setAnimalTuning(t = {}) {
    if (t.sq) Object.assign(animalTune.sq, t.sq);
    if (t.sl) Object.assign(animalTune.sl, t.sl);
  }
  function getAnimalTuning() { return JSON.parse(JSON.stringify(animalTune)); }
  const narrTune = { rate: 1, pitch: 1 };
  function setNarratorTune(t = {}) { Object.assign(narrTune, t); }
  function getNarratorTune() { return { rate: narrTune.rate, pitch: narrTune.pitch }; }

  // One squirrel "kuk" — a sharp chirp that drops fast, with a tiny tooth-click
  function sqChirpNote(t0, f0, dur, peak, rise) {
    const o = ctx.createOscillator(); o.type = 'triangle';
    if (rise) { // question upturn — the chirp sweeps UP
      o.frequency.setValueAtTime(f0 * 0.72, t0);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.3, t0 + dur);
    } else {
      o.frequency.setValueAtTime(f0 * 1.06, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(320, f0 * 0.52), t0 + dur);
    }
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 620;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(hp).connect(g).connect(dest());
    o.start(t0); o.stop(t0 + dur + 0.03);
    voiceNodes.push(o, g, hp);
    // onset click — the hard 'k' of "kuk"
    const len = Math.max(1, Math.floor(ctx.sampleRate * 0.012));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 1.2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(peak * 0.45, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
    s.connect(bp).connect(ng).connect(dest());
    s.start(t0);
    voiceNodes.push(s, ng, bp);
  }

  // Squirrel rattle-trill — "chrrrrr": one note chopped by a fast square LFO
  function sqTrillNote(t0, f0, dur, peak) {
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.linearRampToValueAtTime(f0 * 0.76, t0 + dur);
    const chop = ctx.createGain(); chop.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 28 + Math.random() * 10;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg).connect(chop.gain);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
    g.gain.setValueAtTime(peak, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(chop).connect(hp).connect(g).connect(dest());
    o.start(t0); o.stop(t0 + dur + 0.03);
    lfo.start(t0); lfo.stop(t0 + dur + 0.03);
    voiceNodes.push(o, lfo, lg, g, chop, hp);
  }

  // One seal "ARF" — voiced up-down saw through a throaty lowpass + open-mouth
  // formant, with a raspy breath layer; elders get a chest-sub underneath.
  function slBarkNote(t0, f0, dur, peak, weight, rise, gravel = 1) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 0.6, t0);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.16, t0 + dur * 0.28);
    o.frequency.exponentialRampToValueAtTime(f0 * (rise ? 1.34 : 0.5), t0 + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.5;
    const fm = ctx.createBiquadFilter(); fm.type = 'bandpass'; fm.frequency.value = 620; fm.Q.value = 1.8;
    const mix = ctx.createGain(); mix.gain.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.setValueAtTime(peak, t0 + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(lp).connect(mix);
    o.connect(fm).connect(mix);
    mix.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + dur + 0.05);
    voiceNodes.push(o, g, lp, fm, mix);
    // gravel — the raspy huff of breath inside the bark
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur * 0.8));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.4 * gravel), t0 + 0.014);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.85);
    s.connect(bp).connect(ng).connect(dest());
    s.start(t0);
    voiceNodes.push(s, ng, bp);
    if (weight > 0.12) { // chest sub for the big old bulls
      const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f0 * 0.5;
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t0);
      sg.gain.exponentialRampToValueAtTime(peak * weight, t0 + 0.02);
      sg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      sub.connect(sg).connect(dest());
      sub.start(t0); sub.stop(t0 + dur + 0.05);
      voiceNodes.push(sub, sg);
    }
  }

  // Speak `text` as an animal call. Word count sets call length, !/? shape the
  // delivery, and the profile's base pitch keeps each critter's voice distinct.
  // Returns the vocalization's duration in ms.
  function speakAnimal(species, text, profileKey, opts = {}) {
    if (!ensureCtx()) return 0;
    const prof = VOICE_PROFILES[profileKey] || VOICE_PROFILES.villager;
    const words = Math.max(1, String(text || '').trim().split(/\s+/).length);
    const emphatic = /!/.test(text), question = /\?/.test(text);
    const vol = (opts.volume != null ? opts.volume : 1) * (emphatic ? 1.12 : 1);
    const prevBus = outBus;
    outBus = chan(species === 'sq' ? 'squirrels' : 'seals');
    let t = now() + 0.02, end = t;
    try {
      if (species === 'sq') {
        const T = animalTune.sq;
        const mul = Math.min(1.35, Math.max(0.7, (prof.base || 298) / 280));
        const f0 = Math.min(5200, Math.max(480, 2100 * mul * T.pitch));
        const n = Math.max(2, Math.min(16, Math.round((2 + Math.round(words * 1.4) + (emphatic ? 2 : 0)) * T.length)));
        const slow = (prof.base || 298) < 200 ? 1.3 : 1; // elders chatter slower
        const step = ((emphatic ? 0.078 : 0.098) * slow) / Math.max(0.4, T.speed);
        const trillAt = (T.trill > 0.05 && (String(text).length > 12 || Math.random() < 0.35 * T.trill)) ? Math.floor(n / 2) : -1;
        for (let i = 0; i < n; i++) {
          const last = i === n - 1;
          if (i === trillAt && !last) {
            const td = (0.2 + Math.random() * 0.08) * Math.min(1.7, Math.max(0.6, T.trill));
            sqTrillNote(t, f0 * 0.92, td, 0.26 * vol);
            t += td + step * 0.6; end = t;
            continue;
          }
          const dur = 0.048 + Math.random() * 0.022;
          const jit = 1 + (Math.random() - 0.5) * 0.12;
          sqChirpNote(t, f0 * jit * (last && question ? 1.15 : 1), dur, Math.max(0.12, 0.3 - i * 0.008) * vol, last && question);
          end = t + dur;
          t += step * (1 + (Math.random() - 0.5) * 0.2);
        }
      } else {
        const T = animalTune.sl;
        const mul = Math.min(1.3, Math.max(0.45, (prof.base || 194) / 194));
        const f0 = Math.min(880, Math.max(60, 300 * mul * T.pitch));
        const big = (prof.weight || 0) > 0.2;
        const n = Math.max(1, Math.min(8, Math.round((1 + Math.round(words / 2) + (emphatic ? 1 : 0)) * T.length)));
        const step = (big ? 0.42 : 0.3) / Math.max(0.4, T.speed);
        for (let i = 0; i < n; i++) {
          const last = i === n - 1;
          const dur = ((big ? 0.3 : 0.2 + Math.random() * 0.04) * (last ? 1.25 : 1)) / Math.max(0.7, Math.sqrt(T.speed));
          slBarkNote(t, f0 * (1 + (Math.random() - 0.5) * 0.1), dur, 0.5 * vol, (big ? 0.5 : 0.22) * T.boom, last && question, T.gravel);
          end = t + dur;
          t += step * (1 + (Math.random() - 0.5) * 0.15);
        }
      }
    } finally { outBus = prevBus; }
    return Math.max(0, (end - now()) * 1000);
  }

  // ---- Real text-to-speech for the narrator / story (intelligible voice) ----
  let ttsVoices = [];
  function loadTTSVoices() {
    if (!('speechSynthesis' in window)) return;
    const v = window.speechSynthesis.getVoices();
    if (v && v.length) ttsVoices = v;
  }
  if ('speechSynthesis' in window) {
    loadTTSVoices();
    window.speechSynthesis.onvoiceschanged = loadTTSVoices;
  }
  let ttsVoiceCache = {};
  function pickTTSVoice(deep) {
    if (!ttsVoices.length) loadTTSVoices();
    if (!ttsVoices.length) return null;
    const key = deep ? 'deep' : 'light';
    if (ttsVoiceCache[key] && ttsVoices.includes(ttsVoiceCache[key])) return ttsVoiceCache[key];
    const en = ttsVoices.filter(v => /^en/i.test(v.lang));
    const pool = en.length ? en : ttsVoices;
    // Neural/natural voices sound dramatically smoother than legacy robotic ones —
    // weight them heavily, and blacklist the known tin-can voices.
    const NATURAL = /natural|neural|premium|enhanced|siri/i;
    const KNOWN_SMOOTH = /(google (us|uk) english|samantha|ava|zoe|allison|joanna|matthew|brian|andrew|christopher|guy|davis|ryan|sonia|libby|aria|jenny|daniel|alex)/i;
    const ROBOTIC = /(espeak|e-speak|compact|whisper|albert|zarvox|trinoids|jester|organ|superstar|wobble|bells|boing|bubbles|cellos|bad news|good news|junior|ralph|kathy|fred)/i;
    const FEMALE = /(samantha|female|karen|moira|fiona|tessa|victoria|susan|zira|aria|jenny|sonia|libby|ava|zoe|allison|joanna|emma|olivia)/i;
    const MALE = /(daniel|male|alex|tom|oliver|aaron|rishi|arthur|david|george|james|guy|davis|ryan|andrew|brian|christopher|eric|matthew|nathan|evan)/i;
    const score = v => {
      let s = 0;
      if (ROBOTIC.test(v.name)) s -= 60;
      if (NATURAL.test(v.name)) s += 26;
      if (KNOWN_SMOOTH.test(v.name)) s += 10;
      if (/google|microsoft/i.test(v.name)) s += 5;
      if (v.localService === false) s += 4; // cloud voices are usually the smooth ones
      if (deep) {
        if (MALE.test(v.name)) s += 12;
        if (FEMALE.test(v.name)) s -= 9;
        if (/en[-_]GB/i.test(v.lang)) s += 3; // a deep British read feels epic
      } else {
        if (FEMALE.test(v.name)) s += 4;
      }
      return s;
    };
    const best = pool.slice().sort((a,b) => score(b)-score(a))[0];
    ttsVoiceCache[key] = best;
    return best;
  }
  // Keep rate/pitch near 1.0 — heavy warping is what made the old narrator sound
  // synthetic. Gravitas now comes from picking a genuinely deep natural voice.
  const TTS_PROFILES = {
    narrator: { rate: 0.9,  pitch: 0.92, deep: true },
    god:      { rate: 0.82, pitch: 0.8,  deep: true },
    villager: { rate: 1.02, pitch: 1.05, deep: false },
    samurai:  { rate: 0.95, pitch: 0.9,  deep: true }
  };
  // Narration queue — plays story lines one after another and waits for each
  // to finish (TTS onend) so the narrator is never cut off mid-sentence.
  let narrationQueue = [];
  let narrating = false;
  function enqueueNarration(text, profileKey, opts) {
    narrationQueue.push({ text, profileKey, opts: opts || {} });
    pumpNarration();
  }
  function pumpNarration() {
    if (narrating) return;
    const item = narrationQueue.shift();
    if (!item) return;
    narrating = true;
    if (subtitleCb) { try { subtitleCb(item.text, item.profileKey, item.opts); } catch (e) {} }
    try { duckMusic(0.12, Math.max(2400, String(item.text).length * 95)); } catch (e) {}
    const advance = () => {
      narrating = false;
      // Narrator finished this line and nothing is queued → drop the caption now,
      // exactly when speech stops (so it never disappears mid-sentence).
      if (!narrationQueue.length && subtitleCb) { try { subtitleCb(null); } catch (e) {} }
      // Story-sync hook: the host can chain the next scene beat off this line.
      if (item.opts && item.opts.onDone) { const cb = item.opts.onDone; item.opts.onDone = null; try { cb(); } catch (e) {} }
      // A small breath between lines reads far more human than back-to-back speech.
      setTimeout(pumpNarration, 280);
    };
    // Captioned lines from squirrels/seals are chittered/barked, never read
    // aloud in English — the subtitle carries the words.
    const animalSp = voiceSpecies[item.profileKey];
    if (animalSp === 'sq' || animalSp === 'sl') {
      let vocalMs = 0;
      if (!muted && ensureCtx()) { try { vocalMs = speakAnimal(animalSp, item.text, item.profileKey, {}); } catch (e) {} }
      setTimeout(advance, Math.max(1900, vocalMs + 500, Math.min(item.text.length * 52, 4600)));
      return;
    }
    const nch = chanState.narrator;
    if (muted || nch.muted || nch.vol <= 0.01 || !('speechSynthesis' in window)) {
      setTimeout(advance, Math.max(1900, item.text.length * 48));
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Smooth the text for speech: quotes off, ellipses/dashes become gentle
      // comma-pauses instead of awkward synthesized stops.
      const spoken = String(item.text)
        .replace(/[“”"]/g, '')
        .replace(/\.\.\./g, ', ')
        .replace(/[—–]/g, ', ')
        .replace(/\s+/g, ' ').trim();
      const u = new SpeechSynthesisUtterance(spoken);
      const p = TTS_PROFILES[item.profileKey] || TTS_PROFILES.narrator;
      u.rate = Math.min(2, Math.max(0.5, p.rate * narrTune.rate));
      u.pitch = Math.min(2, Math.max(0.1, p.pitch * narrTune.pitch));
      u.volume = Math.min(1, Math.max(0, nch.vol));
      const v = pickTTSVoice(p.deep);
      if (v) u.voice = v;
      let done = false;
      const adv = () => { if (done) return; done = true; advance(); };
      u.onend = adv; u.onerror = adv;
      // safety net in case onend never fires (some browsers)
      setTimeout(adv, Math.max(3000, item.text.length * 95) + 1800);
      window.speechSynthesis.speak(u);
    } catch (e) { advance(); }
  }
  function speakTTS(text, profileKey) { enqueueNarration(text, profileKey, {}); }

  // Main entry — speak `text`. Captioned narration uses real text-to-speech
  // (intelligible storyteller voice); smiley chatter uses the Animalese synth.
  function speak(text, profileKey='villager', opts={}) {
    if (opts.caption) {
      // Queue captioned narration so each line finishes before the next starts.
      enqueueNarration(text, profileKey, opts);
      return;
    }
    if (!ensureCtx() || muted || !text) return;
    // Smiley voice chatter is silenced during the saga (phase 2+).
    if (smileyVoiceMuted && !opts.force) return;

    // Squirrels chitter, seals bark — routed per-world via setVoiceSpecies.
    const sp = opts.species || voiceSpecies[profileKey];
    if (sp === 'sq' || sp === 'sl') { speakAnimal(sp, text, profileKey, opts); return; }

    const prof = VOICE_PROFILES[profileKey] || VOICE_PROFILES.villager;
    const speedMul = (opts.speed || 1) * prof.speed;
    const clean = String(text).toLowerCase();
    const emphatic = /!/.test(text);
    const question = /\?/.test(text);
    const baseVol = (opts.volume != null ? opts.volume : prof.vol) * (emphatic ? 1.12 : 1.0);

    // Build the sequence of sounding letters
    const letters = [];
    for (const ch of clean) {
      if (/[a-z]/.test(ch)) letters.push(ch);
      else if (ch === ' ') letters.push(' ');
      // punctuation handled via flags
    }
    if (!letters.length) return;

    // Cap duration: long lines play faster so they finish in a reasonable time.
    const baseStep = 0.086 * speedMul; // seconds per letter (slower = bubbly, not buzzy)
    const maxTotal = 3.1;
    const sounding = letters.filter(l => l !== ' ').length;
    const step = Math.min(baseStep, maxTotal / Math.max(8, sounding));

    const myToken = ++voiceToken;
    let t = now() + 0.02;
    const startedT = t;
    letters.forEach((letter, idx) => {
      if (letter === ' ') { t += step * 1.5; return; }
      const isV = VOWELS.includes(letter);
      const dur = (isV ? step * 1.5 : step * 0.7);
      // pitch contour: drift down over sentence; rise at end if question
      const prog = idx / letters.length;
      let freq = prof.base * (1 + (Math.random()-0.5)*prof.jitter);
      freq *= (1 - prog*0.1); // gentle downward drift
      if (question && prog > 0.7) freq *= 1.16; // upturn
      if (emphatic && prog > 0.55) freq *= 1.06;
      const peak = baseVol * (isV ? 0.5 : 0.26);
      if (isV) vowelBlip(letter, t, dur, prof, freq, peak);
      else consBlip(letter, t, dur, prof, freq, peak);
      // advance — distinct blips (little overlap) reads as speech, not a buzz
      t += step * (isV ? 0.95 : 0.82);
    });
    // remember when this utterance ends (for cleanup)
    voiceNodes._token = myToken;
  }

  const VILLAGER_PROFILES = ['villager','child1','child2','healer','flying','water','time'];
  function speakRandom(text) {
    speak(text, VILLAGER_PROFILES[Math.floor(Math.random()*VILLAGER_PROFILES.length)]);
  }

  function stopSpeech() {
    voiceToken++;
    narrationQueue = []; narrating = false;
    voiceNodes.forEach(n => { try { if (n.stop) n.stop(); else if (n.disconnect) n.disconnect(); } catch(e){} });
    voiceNodes = [];
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch(e){} }
    if (subtitleCb) try { subtitleCb(null); } catch (e) {}
  }

  // ---------- specific SFX ----------
  function pop() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(700, t0);
    o.frequency.exponentialRampToValueAtTime(220, t0 + 0.12);
    const g = envGain(t0, 0.005, 0.02, 0.12, 0.35);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.2);
  }

  function thunk() {
    // building / placement: low thump + high tick
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(140, t0);
    o.frequency.exponentialRampToValueAtTime(60, t0 + 0.18);
    const g = envGain(t0, 0.002, 0.03, 0.18, 0.55);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.25);
    noise(0.06, 0.22, 4000, t0);
  }

  function hammer() {
    // quick metallic ping
    if (!ensureCtx() || muted) return;
    const t0 = now();
    tone(900 + Math.random()*200, 0.05, 'square', 0.18, t0);
    noise(0.04, 0.14, 5000, t0);
  }

  function footstep() {
    noise(0.06, 0.14, 700);
  }

  // ---------- CONSTRUCTION (Chapter 2 — build day) ----------
  // Hollow wooden knock — hammering a peg / nailing a beam (huts, tents, fences).
  function woodKnock(freq) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const f = freq || (360 + Math.random()*110);
    const o = ctx.createOscillator(); o.type='triangle';
    o.frequency.setValueAtTime(f*1.7, t0);
    o.frequency.exponentialRampToValueAtTime(f, t0+0.03);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+0.14);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0+0.18);
    // woody second harmonic for the hollow 'tok'
    const o2 = ctx.createOscillator(); o2.type='sine';
    o2.frequency.value = f*2.7;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.exponentialRampToValueAtTime(0.15, t0+0.004);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0+0.06);
    o2.connect(g2).connect(dest());
    o2.start(t0); o2.stop(t0+0.09);
    noise(0.018, 0.12, 3200, t0); // strike click
  }

  // Heavy stone block settling into place — wells, masonry, tumbling rubble.
  function stoneSet() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(190 + Math.random()*40, t0);
    o.frequency.exponentialRampToValueAtTime(80, t0+0.13);
    const g = envGain(t0, 0.002, 0.02, 0.16, 0.5);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0+0.22);
    noise(0.13, 0.2, 1500, t0); // gritty grind of stone-on-stone
  }

  // Bright anvil/forge clang — the smith hammering iron (forge, blades).
  function anvilClang() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [1380, 2090, 3170].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type='triangle';
      o.frequency.value = f * (1 + (Math.random()-0.5)*0.012);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.14/(i+1), t0+0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65 - i*0.13);
      o.connect(g).connect(dest());
      o.start(t0); o.stop(t0+0.75);
    });
    noise(0.03, 0.2, 6500, t0); // hammer strike
  }

  // Soft leafy/earthy rustle — tilling a farm, planting rows.
  function rustle() {
    if (!ensureCtx() || muted) return;
    noise(0.18, 0.13, 1100);
    setTimeout(() => noise(0.12, 0.09, 850), 55);
  }

  function swordSwing() {
    // twin-layer air rip — a bright cutting edge over a low body whoosh
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [[700, 3200, 0.16, 0.3], [280, 1300, 0.22, 0.18]].forEach(([f0, f1, len, peak]) => {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate*len), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filt = ctx.createBiquadFilter(); filt.type='bandpass'; filt.Q.value = 5;
      filt.frequency.setValueAtTime(f0, t0);
      filt.frequency.exponentialRampToValueAtTime(f1, t0 + len);
      const g = envGain(t0, 0.008, len*0.25, len*0.7, peak);
      src.connect(filt).connect(g).connect(dest());
      src.start(t0);
    });
  }

  function swordClang() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [1800, 2400, 3200].forEach((f, i) => tone(f, 0.18 - i*0.03, 'square', 0.12, t0));
    noise(0.05, 0.18, 6000, t0);
  }

  function magicSpell() {
    // wizard: rising arpeggio + shimmer
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [440, 660, 880, 1100].forEach((f, i) => tone(f, 0.18, 'triangle', 0.18, t0 + i*0.05));
    noise(0.25, 0.08, 7000, t0);
  }

  function waterSplash() {
    noise(0.35, 0.28, 1400);
    setTimeout(() => noise(0.15, 0.16, 800), 60);
  }

  function flap() {
    // wing flap: low wind whoosh
    noise(0.12, 0.18, 500);
  }

  function timeWarp() {
    // tick-tock + descending arpeggio
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [1200, 900, 600, 450].forEach((f, i) => tone(f, 0.1, 'sine', 0.15, t0 + i*0.05));
    tone(2000, 0.04, 'square', 0.08, t0);
    tone(1500, 0.04, 'square', 0.08, t0 + 0.18);
  }

  function healChime() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    tone(880, 0.3, 'sine', 0.22, t0);
    tone(1320, 0.3, 'sine', 0.18, t0);
    tone(1760, 0.3, 'sine', 0.12, t0 + 0.04);
  }

  function giantStomp() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(70, t0);
    o.frequency.exponentialRampToValueAtTime(28, t0 + 0.4);
    const g = envGain(t0, 0.002, 0.05, 0.4, 0.7);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.5);
    noise(0.18, 0.25, 1200, t0);
  }

  function hit() {
    // anime body blow: sub thump + slap crack + gut crunch
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(160, t0);
    o.frequency.exponentialRampToValueAtTime(48, t0 + 0.11);
    const g = envGain(t0, 0.001, 0.02, 0.16, 0.55);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.2);
    noise(0.045, 0.4, 5200, t0);      // slap crack
    noise(0.12, 0.22, 1700, t0 + 0.01); // body crunch
  }

  function ghostOut() {
    // descending wavy "owww"
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='triangle';
    o.frequency.setValueAtTime(520, t0);
    o.frequency.exponentialRampToValueAtTime(110, t0 + 0.6);
    const g = envGain(t0, 0.02, 0.1, 0.55, 0.3);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.7);
  }

  function wallCrack() {
    // sharp crack + low rumble
    if (!ensureCtx() || muted) return;
    const t0 = now();
    noise(0.08, 0.45, 5000, t0);
    tone(120, 0.4, 'sawtooth', 0.25, t0);
  }

  function wallCollapse() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    // big rumble
    noise(1.4, 0.55, 800, t0);
    // tumbling STONE rubble (not generic thumps — this is a stone wall)
    for (let i=0;i<10;i++) {
      setTimeout(() => stoneSet(), 70 + i*110 + Math.random()*70);
    }
  }

  function divineChoir() {
    // big sustained major chord + shimmer
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const dur = 5.0;
    [261.63, 329.63, 392.00, 523.25, 659.25].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.13, t0 + 1.2);
      g.gain.setValueAtTime(0.13, t0 + dur - 1.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      // gentle vibrato
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4 + i*0.3;
      const lfoG = ctx.createGain(); lfoG.gain.value = 1.5;
      lfo.connect(lfoG).connect(o.frequency);
      lfo.start(t0); lfo.stop(t0 + dur);
      o.connect(g).connect(dest());
      o.start(t0); o.stop(t0 + dur + 0.1);
    });
    // shimmer
    setTimeout(() => sparkleShimmer(), 500);
  }

  function sparkleShimmer() {
    if (!ensureCtx() || muted) return;
    for (let i=0;i<8;i++) {
      setTimeout(() => {
        tone(2000 + Math.random()*2000, 0.16, 'sine', 0.08);
      }, i * 90 + Math.random()*60);
    }
  }

  function heartPop() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(600, t0);
    o.frequency.exponentialRampToValueAtTime(1200, t0 + 0.15);
    const g = envGain(t0, 0.005, 0.02, 0.15, 0.18);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.2);
  }

  // ---------- EMBRACE (Chapter 4 — the smileys reconcile) ----------
  // A warm, slow-swelling major chord — like arms wrapping around someone.
  // The gentle attack IS the squeeze; a soft sparkle blooms at the peak.
  function embrace() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const dur = 2.8;
    [261.63, 329.63, 392.00, 587.33].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(f*0.99, t0);
      o.frequency.linearRampToValueAtTime(f, t0+0.55); // settle warmly into tune
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0+0.75); // slow swell = the hug
      g.gain.setValueAtTime(0.12, t0+dur-1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 3 + i*0.45;
      const lfoG = ctx.createGain(); lfoG.gain.value = 1.3;
      lfo.connect(lfoG).connect(o.frequency);
      lfo.start(t0); lfo.stop(t0+dur);
      o.connect(g).connect(dest());
      o.start(t0); o.stop(t0+dur+0.1);
    });
    // warm low body — the held breath of a long hug
    const sub = ctx.createOscillator(); sub.type='sine'; sub.frequency.value = 130.81;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.exponentialRampToValueAtTime(0.08, t0+0.85);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    sub.connect(sg).connect(dest());
    sub.start(t0); sub.stop(t0+dur+0.1);
    setTimeout(() => sparkleShimmer(), 750);
  }

  // Cavalry bugle — the CHARGE call: ta-ta-ta ta-ta-ta CHAAA! rising to a held peak
  function chargeHorn() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const note = (freq, at, dur, peak = 0.5) => {
      // brass edge: sawtooth through a lowpass, plus a rounder octave-down body
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; f.Q.value = 1.1;
      const g = envGain(t0 + at, 0.02, dur * 0.65, dur * 0.5, peak);
      o.connect(f).connect(g).connect(dest());
      o.start(t0 + at); o.stop(t0 + at + dur + 0.2);
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq / 2;
      const g2 = envGain(t0 + at, 0.02, dur * 0.65, dur * 0.5, peak * 0.55);
      o2.connect(g2).connect(dest());
      o2.start(t0 + at); o2.stop(t0 + at + dur + 0.2);
    };
    // the classic bugle "Charge!" figure — galloping triplets up the triad
    note(392.0, 0.00, 0.09, 0.40); note(523.3, 0.10, 0.09, 0.42); note(659.3, 0.20, 0.09, 0.44);
    note(392.0, 0.32, 0.09, 0.42); note(523.3, 0.42, 0.09, 0.44); note(659.3, 0.52, 0.09, 0.46);
    note(784.0, 0.66, 0.62, 0.55);           // the held CHAAA
    note(784.0, 1.06, 0.30, 0.35);           // echo tail
  }

  function fanfare() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [523, 659, 784, 1046].forEach((f, i) =>
      tone(f, 0.4, 'triangle', 0.25, t0 + i*0.12));
  }

  function chapterWhoosh() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    noise(0.6, 0.35, 1800, t0);
    const o = ctx.createOscillator(); o.type='sawtooth';
    o.frequency.setValueAtTime(80, t0);
    o.frequency.exponentialRampToValueAtTime(220, t0 + 0.5);
    const g = envGain(t0, 0.02, 0.1, 0.45, 0.22);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.6);
  }

  // ---------- CINEMATIC / CUTSCENE SFX ----------
  // Deep taiko war drum — for tension beats
  function taiko(peak=0.7) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(170, t0);
    o.frequency.exponentialRampToValueAtTime(52, t0 + 0.16);
    const g = envGain(t0, 0.002, 0.05, 0.35, peak);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.45);
    noise(0.07, 0.28, 1400, t0); // skin slap
  }

  // Metallic blade ring — bright, long sustain
  function shing() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [2600, 3900, 5300].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type='triangle';
      o.frequency.setValueAtTime(f * 0.94, t0);
      o.frequency.exponentialRampToValueAtTime(f, t0 + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16 / (i + 1), t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0 - i * 0.18);
      o.connect(g).connect(dest());
      o.start(t0); o.stop(t0 + 1.1);
    });
    noise(0.04, 0.12, 9000, t0);
  }

  // Huge bone-crunching impact — sub thud + crunch + ring
  function bigImpact() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(120, t0);
    o.frequency.exponentialRampToValueAtTime(34, t0 + 0.28);
    const g = envGain(t0, 0.002, 0.06, 0.32, 0.9);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.45);
    // crunch
    noise(0.2, 0.55, 2600, t0);
    // metallic clang layered
    const o2 = ctx.createOscillator(); o2.type='square';
    o2.frequency.value = 380;
    const g2 = envGain(t0, 0.002, 0.04, 0.2, 0.16);
    o2.connect(g2).connect(dest());
    o2.start(t0); o2.stop(t0 + 0.25);
  }

  // Lighter rapid hit (multi-hit barrage)
  function impactLite() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(180, t0);
    o.frequency.exponentialRampToValueAtTime(60, t0 + 0.1);
    const g = envGain(t0, 0.002, 0.02, 0.12, 0.5);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.18);
    noise(0.08, 0.3, 3200, t0);
  }

  // Air ripped apart by a lunging dash — short, aggressive whoosh
  function dashWhoosh(pitch=1) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const len = 0.17;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate*len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type='bandpass'; filt.Q.value = 3.5;
    filt.frequency.setValueAtTime(420*pitch, t0);
    filt.frequency.exponentialRampToValueAtTime(2900*pitch, t0+len);
    const g = envGain(t0, 0.006, 0.03, len-0.03, 0.32);
    src.connect(filt).connect(g).connect(dest());
    src.start(t0);
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(300*pitch, t0);
    o.frequency.exponentialRampToValueAtTime(90, t0+len);
    const og = envGain(t0, 0.004, 0.02, len-0.02, 0.12);
    o.connect(og).connect(dest());
    o.start(t0); o.stop(t0+len+0.05);
  }

  // Bright metallic *chink* — the spark at the exact moment of contact
  function hitSpark() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    [3400, 5100].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type='triangle';
      o.frequency.setValueAtTime(f*(1+(Math.random()-0.5)*0.04), t0);
      const g = envGain(t0, 0.001, 0.008, 0.11-i*0.03, 0.1/(i+1));
      o.connect(g).connect(dest());
      o.start(t0); o.stop(t0+0.16);
    });
    noise(0.02, 0.16, 9000, t0);
  }

  // Descending whistle as a KO'd smiley sails away
  function fallWhistle() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(1600, t0);
    o.frequency.exponentialRampToValueAtTime(420, t0+0.55);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 11;
    const lg = ctx.createGain(); lg.gain.value = 40;
    lfo.connect(lg).connect(o.frequency);
    const g = envGain(t0, 0.02, 0.3, 0.28, 0.11);
    o.connect(g).connect(dest());
    lfo.start(t0); lfo.stop(t0+0.6);
    o.start(t0); o.stop(t0+0.62);
  }

  // Single machine-gun round — sharp crack + low pop body
  function gunShot() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    noise(0.035, 0.38, 4200, t0);
    const o = ctx.createOscillator(); o.type='square';
    o.frequency.setValueAtTime(220, t0);
    o.frequency.exponentialRampToValueAtTime(85, t0+0.05);
    const g = envGain(t0, 0.001, 0.01, 0.07, 0.26);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0+0.1);
  }

  // Sky-splitting THUNDERBOLT — crack + zap drop + rolling rumble tail
  function thunder() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    noise(0.05, 0.55, 7000, t0); // the crack
    const o = ctx.createOscillator(); o.type='sawtooth';
    o.frequency.setValueAtTime(900, t0);
    o.frequency.exponentialRampToValueAtTime(70, t0+0.22);
    const g = envGain(t0, 0.001, 0.03, 0.24, 0.38);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0+0.3);
    rumble(1.1, 0.28);
    setTimeout(() => noise(0.5, 0.18, 900), 130); // rolling tail
  }

  // Chapter curtain FALLING — heavy fabric sweep down + landing boom
  function curtainDrop() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const len = 0.65;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate*len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type='bandpass'; filt.Q.value=1.6;
    filt.frequency.setValueAtTime(2600, t0);
    filt.frequency.exponentialRampToValueAtTime(240, t0+len);
    const g = envGain(t0, 0.02, 0.2, len-0.2, 0.3);
    src.connect(filt).connect(g).connect(dest());
    src.start(t0);
    rumble(0.9, 0.2);
    setTimeout(() => taiko(0.85), len*1000 - 90);
  }

  // Chapter curtain LIFTING — airy rising sweep + a soft shimmer
  function curtainLift() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const len = 0.9;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate*len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type='bandpass'; filt.Q.value=1.8;
    filt.frequency.setValueAtTime(300, t0);
    filt.frequency.exponentialRampToValueAtTime(3600, t0+len);
    const g = envGain(t0, 0.06, 0.25, len-0.3, 0.2);
    src.connect(filt).connect(g).connect(dest());
    src.start(t0);
    setTimeout(() => sparkleShimmer(), 380);
  }

  // Rising charge whoosh — builds before a strike
  function chargeWhoosh2() {
    if (!ensureCtx() || muted) return;
    const t0 = now(); const len = 0.75;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type='bandpass'; filt.Q.value=2.2;
    filt.frequency.setValueAtTime(280, t0);
    filt.frequency.exponentialRampToValueAtTime(3400, t0 + len);
    const g = envGain(t0, 0.06, 0.2, len - 0.22, 0.32);
    src.connect(filt).connect(g).connect(dest());
    src.start(t0);
  }

  // Ominous low rumble — for GOGOGO menace
  function rumble(dur=1.3, peak=0.35) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sawtooth';
    o.frequency.value = 44;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7;
    const lfoG = ctx.createGain(); lfoG.gain.value = 8;
    lfo.connect(lfoG).connect(o.frequency);
    const filt = ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value = 160;
    const g = envGain(t0, 0.2, dur - 0.6, 0.4, peak);
    o.connect(filt).connect(g).connect(dest());
    lfo.start(t0); lfo.stop(t0 + dur + 0.1);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }

  // Comedic "boing"/launch for a smiley flying off
  function launch() {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(200, t0);
    o.frequency.exponentialRampToValueAtTime(1400, t0 + 0.35);
    const g = envGain(t0, 0.005, 0.05, 0.3, 0.3);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0 + 0.45);
  }

  // Sharp escalating STONE CRACK — level 0..1 grows pitch-drop, rumble + pebbles.
  // Used as the great wall fractures over the final build days.
  function crackHit(level=0.5) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const lv = Math.max(0, Math.min(1, level));
    // bright snap transient (the 'crack')
    noise(0.05 + lv*0.05, 0.4 + lv*0.35, 5000 + lv*3500, t0);
    // pitched 'crrk' body dropping fast
    const o = ctx.createOscillator(); o.type='square';
    o.frequency.setValueAtTime(440 - lv*140, t0);
    o.frequency.exponentialRampToValueAtTime(85 - lv*25, t0+0.12);
    const g = envGain(t0, 0.001, 0.02, 0.16, 0.22 + lv*0.22);
    o.connect(g).connect(dest());
    o.start(t0); o.stop(t0+0.2);
    // low rumble that grows with level
    const r = ctx.createOscillator(); r.type='sawtooth'; r.frequency.value = 72 - lv*22;
    const rf = ctx.createBiquadFilter(); rf.type='lowpass'; rf.frequency.value = 200;
    const rg = envGain(t0, 0.02, 0.1 + lv*0.3, 0.3 + lv*0.35, 0.1 + lv*0.26);
    r.connect(rf).connect(rg).connect(dest());
    r.start(t0); r.stop(t0 + 0.6 + lv*0.6);
    // pebbles skittering down (more as it worsens)
    const peb = 2 + Math.floor(lv*5);
    for (let i=0;i<peb;i++) {
      setTimeout(() => tone(600 + Math.random()*1000, 0.05, 'square', 0.08, now()), 40 + i*52 + Math.random()*40);
    }
  }

  // RAMP-UP — rising whoosh + sub sweep + accelerating war-drums that build to a
  // climax. Call right before a big hit so the impact lands with weight.
  function boomRamp(dur=1.2, peak=0.55) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const len = Math.max(0.4, dur);
    // rising filtered-noise whoosh
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate*len)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type='bandpass'; filt.Q.value = 1.4;
    filt.frequency.setValueAtTime(180, t0);
    filt.frequency.exponentialRampToValueAtTime(3400, t0+len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak*0.5, t0+len*0.6);
    g.gain.exponentialRampToValueAtTime(peak, t0+len);
    src.connect(filt).connect(g).connect(dest());
    src.start(t0);
    // rising sub
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(38, t0);
    o.frequency.exponentialRampToValueAtTime(120, t0+len);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(peak*0.6, t0+len);
    o.connect(og).connect(dest());
    o.start(t0); o.stop(t0+len+0.05);
    // accelerating taiko hits charging to the climax
    let tt = 0, gap = 0.27;
    while (tt < len - 0.04) {
      const when = tt;
      setTimeout(() => onBus('combat', () => taiko(0.35 + 0.55*(when/len))), when*1000);
      gap *= 0.82; tt += gap;
    }
  }

  // KABOOM — a massive layered explosion (sub-drop boom + body blast + crunch +
  // bright bang + rumbling debris tail). power scales the whole thing.
  function kaboom(power=1) {
    if (!ensureCtx() || muted) return;
    const t0 = now();
    const P = Math.max(0.5, power);
    // 1) deep sub drop — the BOOM
    const sub = ctx.createOscillator(); sub.type='sine';
    sub.frequency.setValueAtTime(150*Math.min(1.4,P), t0);
    sub.frequency.exponentialRampToValueAtTime(24, t0+0.5);
    const sg = envGain(t0, 0.002, 0.08, 0.5, Math.min(1.0, 0.9*P));
    sub.connect(sg).connect(dest());
    sub.start(t0); sub.stop(t0+0.7);
    // 2) big body blast — lowpassed noise
    noise(0.5, Math.min(0.85, 0.6*P), 1400, t0);
    // 3) crunch — mid noise
    noise(0.22, Math.min(0.7, 0.5*P), 3400, t0);
    // 4) bright metallic BANG transient
    const o2 = ctx.createOscillator(); o2.type='square';
    o2.frequency.setValueAtTime(560, t0);
    o2.frequency.exponentialRampToValueAtTime(170, t0+0.18);
    const g2 = envGain(t0, 0.001, 0.03, 0.22, Math.min(0.3, 0.2*P));
    o2.connect(g2).connect(dest());
    o2.start(t0); o2.stop(t0+0.25);
    // 5) rumbling debris tail
    const r = ctx.createOscillator(); r.type='sawtooth'; r.frequency.value = 46;
    const rf = ctx.createBiquadFilter(); rf.type='lowpass'; rf.frequency.value = 180;
    const rg = envGain(t0+0.05, 0.05, 0.4, 0.7, Math.min(0.3, 0.2*P));
    r.connect(rf).connect(rg).connect(dest());
    r.start(t0); r.stop(t0+1.2);
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.value = muted ? 0 : 0.95 * masterVol;
    if (muted) stopSpeech();
  }
  function setSmileyVoiceMuted(b) { smileyVoiceMuted = !!b; }

  // Ambient gentle hum during peace (chapter 4 happy ending)
  function startPeaceHum() {
    if (!ensureCtx() || muted) return;
    if (ambientGain) return;
    const t0 = now();
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.gain.setTargetAtTime(0.06, t0, 1.5);
    ambientGain.connect(chan('music'));
    [261.63, 329.63, 392.00].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15 + i*0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.4;
      lfo.connect(lfoG).connect(g.gain);
      lfo.start(); 
      o.connect(g).connect(ambientGain);
      o.start();
    });
  }
  function stopPeaceHum() {
    if (!ambientGain) return;
    ambientGain.gain.setTargetAtTime(0, now(), 0.3);
    setTimeout(() => { try { ambientGain.disconnect(); } catch(e){} ambientGain = null; }, 1500);
  }

  // ---------- Background music ----------
  // Original anime-style tracks (synth — not any copyrighted soundtrack):
  // playground (light/fun), build (rising tension), battle (epic driving),
  // climax (grand finisher), happy (warm ending).
  let musicState = null;

  // Notes (Hz)
  const NOTES = {
    C2:65.41, D2:73.42, E2:82.41, F2:87.31, G2:98.00, A2:110.00, B2:123.47, Gs2:103.83,
    C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94, As3:233.08,
    C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88, As4:466.16,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77, As5:932.33,
    C6:1046.50, D6:1174.66, E6:1318.51
  };

  function musicDest() { return musicState ? musicState.gain : chan('music'); }

  // Bell / kalimba pluck
  function playBellNote(freq, t0, dur=0.6, peak=0.18) {
    if (!ensureCtx()) return;
    const o = ctx.createOscillator(); o.type='sine'; o.frequency.value=freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const o2 = ctx.createOscillator(); o2.type='sine'; o2.frequency.value=freq*2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.exponentialRampToValueAtTime(peak*0.25, t0 + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur*0.7);
    o.connect(g).connect(musicDest());
    o2.connect(g2).connect(musicDest());
    o.start(t0); o.stop(t0+dur+0.05); o2.start(t0); o2.stop(t0+dur*0.7+0.05);
  }

  // Soft pad
  function playPadNote(freq, t0, dur=2.0, peak=0.07) {
    if (!ensureCtx()) return;
    const o = ctx.createOscillator(); o.type='triangle'; o.frequency.value=freq;
    const filt = ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.4);
    g.gain.setValueAtTime(peak, t0 + dur - 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(filt).connect(g).connect(musicDest());
    o.start(t0); o.stop(t0+dur+0.05);
  }

  // Bright detuned saw lead (anime melody)
  function playLead(freq, t0, dur, peak) {
    if (!ensureCtx()) return;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(Math.min(6500, freq*6), t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(700, freq*2.2), t0+dur*0.85);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    [1, 1.006].forEach(m => {
      const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=freq*m;
      o.connect(lp); o.start(t0); o.stop(t0+dur+0.05);
    });
    lp.connect(g).connect(musicDest());
  }

  // Brass-like stab chord-note
  function playStab(freq, t0, dur, peak) {
    if (!ensureCtx()) return;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0+0.016);
    g.gain.exponentialRampToValueAtTime(peak*0.45, t0+dur*0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    [1, 1.004, 0.996].forEach(m => {
      const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=freq*m;
      o.connect(lp); o.start(t0); o.stop(t0+dur+0.05);
    });
    lp.connect(g).connect(musicDest());
  }

  // Staccato bass pulse
  function playPulse(freq, t0, dur, peak) {
    if (!ensureCtx()) return;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    const o=ctx.createOscillator(); o.type='triangle'; o.frequency.value=freq;
    const o2=ctx.createOscillator(); o2.type='sawtooth'; o2.frequency.value=freq;
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(musicDest());
    o.start(t0); o.stop(t0+dur+0.03); o2.start(t0); o2.stop(t0+dur+0.03);
  }

  // Drums: kick / snare / taiko / hat
  function playDrum(type, t0, peak) {
    if (!ensureCtx()) return;
    const dest = musicDest();
    if (type==='kick') {
      const o=ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(150,t0); o.frequency.exponentialRampToValueAtTime(45,t0+0.12);
      const g=ctx.createGain(); g.gain.setValueAtTime(peak,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.18);
      o.connect(g).connect(dest); o.start(t0); o.stop(t0+0.2);
    } else if (type==='snare' || type==='taiko') {
      const o=ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(type==='taiko'?185:300,t0);
      o.frequency.exponentialRampToValueAtTime(type==='taiko'?72:150,t0+0.12);
      const g=ctx.createGain(); g.gain.setValueAtTime(peak,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.2);
      o.connect(g).connect(dest); o.start(t0); o.stop(t0+0.22);
      const len=Math.floor(ctx.sampleRate*0.12); const buf=ctx.createBuffer(1,len,ctx.sampleRate); const d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const s=ctx.createBufferSource(); s.buffer=buf;
      const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=type==='taiko'?350:1300;
      const ng=ctx.createGain(); ng.gain.setValueAtTime(peak*(type==='taiko'?0.35:0.8),t0); ng.gain.exponentialRampToValueAtTime(0.0001,t0+0.12);
      s.connect(hp).connect(ng).connect(dest); s.start(t0);
    } else if (type==='hat') {
      const len=Math.floor(ctx.sampleRate*0.04); const buf=ctx.createBuffer(1,len,ctx.sampleRate); const d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const s=ctx.createBufferSource(); s.buffer=buf;
      const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7000;
      const g=ctx.createGain(); g.gain.setValueAtTime(peak*0.5,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.04);
      s.connect(hp).connect(g).connect(dest); s.start(t0);
    }
  }

  // ── TRACKS ── entries: [beatOffset, noteOrType, dur, peak, kind]
  const PLAYGROUND_PATTERN = [
    [0,NOTES.C5,.4,.13,'bell'],[0.5,NOTES.E5,.4,.12,'bell'],[1,NOTES.G5,.45,.13,'bell'],[1.5,NOTES.E5,.3,.1,'bell'],
    [2,NOTES.F5,.4,.12,'bell'],[2.5,NOTES.D5,.4,.11,'bell'],[3,NOTES.E5,.5,.12,'bell'],
    [4,NOTES.G5,.4,.13,'bell'],[4.5,NOTES.A5,.4,.12,'bell'],[5,NOTES.G5,.4,.12,'bell'],[5.5,NOTES.E5,.3,.1,'bell'],
    [6,NOTES.D5,.4,.11,'bell'],[6.5,NOTES.F5,.4,.11,'bell'],[7,NOTES.C5,.6,.12,'bell'],
    [0,NOTES.C3,.45,.08,'pulse'],[1,NOTES.G3,.45,.07,'pulse'],[2,NOTES.F3,.45,.07,'pulse'],[3,NOTES.G3,.45,.07,'pulse'],
    [4,NOTES.C3,.45,.08,'pulse'],[5,NOTES.E3,.45,.07,'pulse'],[6,NOTES.F3,.45,.07,'pulse'],[7,NOTES.G3,.45,.07,'pulse'],
    [0,'hat',0,.05,'drum'],[1,'hat',0,.04,'drum'],[2,'hat',0,.05,'drum'],[3,'hat',0,.04,'drum'],
    [4,'hat',0,.05,'drum'],[5,'hat',0,.04,'drum'],[6,'hat',0,.05,'drum'],[7,'hat',0,.04,'drum'],
    [0.5,'hat',0,.03,'drum'],[1.5,'hat',0,.03,'drum'],[2.5,'hat',0,.03,'drum'],[3.5,'hat',0,.03,'drum'],
    [4.5,'hat',0,.03,'drum'],[5.5,'hat',0,.03,'drum'],[6.5,'hat',0,.03,'drum'],[7.5,'hat',0,.03,'drum']
  ];

  const BUILD_PATTERN = [
    // ostinato eighth-note pulse (A minor) — steady determination
    [0,NOTES.A2,.24,.1,'pulse'],[0.5,NOTES.A2,.24,.08,'pulse'],[1,NOTES.A2,.24,.1,'pulse'],[1.5,NOTES.A2,.24,.08,'pulse'],
    [2,NOTES.A2,.24,.1,'pulse'],[2.5,NOTES.A2,.24,.08,'pulse'],[3,NOTES.C3,.24,.1,'pulse'],[3.5,NOTES.C3,.24,.08,'pulse'],
    [4,NOTES.F2,.24,.1,'pulse'],[4.5,NOTES.F2,.24,.08,'pulse'],[5,NOTES.F2,.24,.1,'pulse'],[5.5,NOTES.F2,.24,.08,'pulse'],
    [6,NOTES.E2,.24,.1,'pulse'],[6.5,NOTES.E2,.24,.08,'pulse'],[7,NOTES.E2,.24,.1,'pulse'],[7.5,NOTES.G2,.24,.08,'pulse'],
    [0,'taiko',0,.18,'drum'],[2,'taiko',0,.13,'drum'],[4,'taiko',0,.18,'drum'],[6,'taiko',0,.13,'drum'],
    [3.5,'snare',0,.1,'drum'],[7.5,'snare',0,.1,'drum'],
    // rising motif, builds hope
    [1,NOTES.A4,.5,.085,'lead'],[1.5,NOTES.C5,.5,.085,'lead'],[3,NOTES.E5,.7,.095,'lead'],
    [5,NOTES.A4,.5,.085,'lead'],[5.5,NOTES.C5,.5,.085,'lead'],[6.5,NOTES.D5,.4,.085,'lead'],[7,NOTES.E5,.8,.1,'lead'],
    [0,NOTES.A3,4,.045,'pad'],[0,NOTES.E3,4,.04,'pad'],[4,NOTES.F3,4,.045,'pad'],[4,NOTES.C4,4,.04,'pad']
  ];

  const BATTLE_PATTERN = [
    // driving syncopated bass
    [0,NOTES.A2,.22,.11,'pulse'],[0.5,NOTES.A2,.2,.09,'pulse'],[1,NOTES.A2,.22,.11,'pulse'],[1.75,NOTES.A2,.18,.09,'pulse'],
    [2,NOTES.G2,.22,.11,'pulse'],[2.5,NOTES.G2,.2,.09,'pulse'],[3,NOTES.G2,.22,.11,'pulse'],[3.75,NOTES.G2,.18,.09,'pulse'],
    [4,NOTES.F2,.22,.11,'pulse'],[4.5,NOTES.F2,.2,.09,'pulse'],[5,NOTES.F2,.22,.11,'pulse'],[5.75,NOTES.F2,.18,.09,'pulse'],
    [6,NOTES.E2,.22,.11,'pulse'],[6.5,NOTES.E2,.2,.09,'pulse'],[7,NOTES.E2,.22,.11,'pulse'],[7.5,NOTES.E2,.18,.09,'pulse'],
    [0,'kick',0,.2,'drum'],[1,'kick',0,.15,'drum'],[2,'kick',0,.2,'drum'],[3,'kick',0,.15,'drum'],
    [4,'kick',0,.2,'drum'],[5,'kick',0,.15,'drum'],[6,'kick',0,.2,'drum'],[7,'kick',0,.15,'drum'],
    [1,'snare',0,.13,'drum'],[3,'snare',0,.13,'drum'],[5,'snare',0,.13,'drum'],[7,'snare',0,.14,'drum'],
    [0,NOTES.A3,.4,.09,'stab'],[2,NOTES.G3,.4,.09,'stab'],[4,NOTES.F3,.4,.09,'stab'],[6,NOTES.E3,.45,.1,'stab'],
    // fast heroic lead
    [0,NOTES.A5,.25,.085,'lead'],[0.5,NOTES.E5,.25,.075,'lead'],[1,NOTES.A5,.25,.085,'lead'],[1.5,NOTES.C6,.3,.095,'lead'],
    [2,NOTES.B5,.25,.08,'lead'],[2.5,NOTES.G5,.25,.075,'lead'],[3,NOTES.D5,.4,.085,'lead'],
    [4,NOTES.F5,.25,.085,'lead'],[4.5,NOTES.C5,.25,.075,'lead'],[5,NOTES.F5,.25,.085,'lead'],[5.5,NOTES.A5,.3,.095,'lead'],
    [6,NOTES.G5,.25,.08,'lead'],[6.5,NOTES.E5,.25,.075,'lead'],[7,NOTES.A5,.5,.1,'lead']
  ];

  const CLIMAX_PATTERN = [
    [0,NOTES.A3,3.8,.07,'pad'],[0,NOTES.C4,3.8,.05,'pad'],[0,NOTES.E4,3.8,.05,'pad'],
    [4,NOTES.F3,3.8,.07,'pad'],[4,NOTES.A3,3.8,.05,'pad'],[4,NOTES.C4,3.8,.05,'pad'],
    [0,'taiko',0,.22,'drum'],[1.5,'taiko',0,.15,'drum'],[3,'taiko',0,.2,'drum'],
    [4,'taiko',0,.22,'drum'],[5.5,'taiko',0,.15,'drum'],[7,'taiko',0,.2,'drum'],
    [0,NOTES.A5,1,.11,'lead'],[1,NOTES.G5,1,.1,'lead'],[2,NOTES.E5,1.5,.11,'lead'],
    [4,NOTES.F5,1,.11,'lead'],[5,NOTES.E5,1,.1,'lead'],[6,NOTES.C5,2,.11,'lead']
  ];

  const HAPPY_PATTERN = [
    [0,NOTES.G4,1.0,.13,'bell'],[1,NOTES.C5,1.0,.14,'bell'],[2,NOTES.E5,1.0,.14,'bell'],[3,NOTES.G5,1.5,.15,'bell'],
    [4,NOTES.E5,1.0,.13,'bell'],[5,NOTES.D5,1.0,.12,'bell'],[6,NOTES.C5,2.0,.14,'bell'],
    [0,NOTES.C3,4.0,.08,'pad'],[0,NOTES.E3,4.0,.06,'pad'],[0,NOTES.G3,4.0,.06,'pad'],
    [4,NOTES.F3,4.0,.08,'pad'],[4,NOTES.A3,4.0,.06,'pad'],[4,NOTES.C4,4.0,.06,'pad']
  ];

  const TRACKS = {
    playground: { pattern: PLAYGROUND_PATTERN, tempo: 126, beats: 8 },
    build:      { pattern: BUILD_PATTERN,      tempo: 108, beats: 8 },
    battle:     { pattern: BATTLE_PATTERN,     tempo: 150, beats: 8 },
    climax:     { pattern: CLIMAX_PATTERN,     tempo: 78,  beats: 8 },
    happy:      { pattern: HAPPY_PATTERN,      tempo: 70,  beats: 8 }
  };

  function startMusic(kind, opts={}) {
    if (!ensureCtx()) return;
    if (musicState) stopMusic();
    const track = TRACKS[kind] || TRACKS.playground;
    const beatDur = 60 / track.tempo;
    const loopDur = beatDur * track.beats;
    const baseVol = opts.volume != null ? opts.volume : 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(baseVol, now(), 0.5);
    gain.connect(chan('music'));
    musicState = { kind, gain, baseVol, loopId: null, nextStart: now() + 0.06 };

    function scheduleLoop() {
      if (!musicState) return;
      const start = musicState.nextStart;
      track.pattern.forEach(([off, val, dur, peak, ktype]) => {
        const t = start + off * beatDur;
        if (ktype === 'bell') playBellNote(val, t, dur, peak);
        else if (ktype === 'pad') playPadNote(val, t, dur, peak);
        else if (ktype === 'lead') playLead(val, t, dur, peak);
        else if (ktype === 'stab') playStab(val, t, dur, peak);
        else if (ktype === 'pulse') playPulse(val, t, dur, peak);
        else if (ktype === 'drum') playDrum(val, t, peak);
      });
      musicState.nextStart = start + loopDur;
    }
    scheduleLoop();
    musicState.loopId = setInterval(() => {
      if (!musicState) return;
      if (musicState.nextStart - now() < 0.6) scheduleLoop();
    }, 200);
  }

  function stopMusic() {
    if (!musicState) return;
    const ms = musicState;
    musicState = null;
    clearInterval(ms.loopId);
    try {
      ms.gain.gain.cancelScheduledValues(now());
      ms.gain.gain.setTargetAtTime(0, now(), 0.3);
      setTimeout(() => { try { ms.gain.disconnect(); } catch(e){} }, 1500);
    } catch(e) {}
  }

  // Duck the music down while narration plays, then restore.
  let duckTimer = null;
  function duckMusic(amount=0.28, holdMs=1600) {
    if (!musicState) return;
    try {
      musicState.gain.gain.cancelScheduledValues(now());
      musicState.gain.gain.setTargetAtTime(musicState.baseVol * amount, now(), 0.1);
    } catch(e){}
    if (duckTimer) clearTimeout(duckTimer);
    duckTimer = setTimeout(() => {
      if (musicState) { try { musicState.gain.gain.setTargetAtTime(musicState.baseVol, now(), 0.45); } catch(e){} }
    }, holdMs);
  }

  window.__sfx = {
    unlock, setMuted, get muted() { return muted; },
    setSmileyVoiceMuted,
    babble, babbleWord,
    speak, speakRandom, stopSpeech, setSubtitleCallback,
    setVoiceSpecies, speakAnimal,
    setChannel, getMixer, setMasterVolume,
    setAnimalTuning, getAnimalTuning, setNarratorTune, getNarratorTune,
    pop, thunk, hammer, footstep,
    woodKnock, stoneSet, anvilClang, rustle, embrace,
    swordSwing, swordClang, magicSpell, waterSplash,
    flap, timeWarp, healChime, giantStomp,
    hit, ghostOut,
    wallCrack, wallCollapse,
    divineChoir, sparkleShimmer, heartPop,
    fanfare, chapterWhoosh,
    startPeaceHum, stopPeaceHum,
    startMusic, stopMusic, duckMusic,
    taiko, shing, bigImpact, impactLite, chargeWhoosh2, rumble, launch, chargeHorn,
    dashWhoosh, hitSpark, fallWhistle, gunShot, thunder, curtainDrop, curtainLift,
    crackHit, boomRamp, kaboom
  };
  // Fight sounds run through the 'combat' bus so the mixer can duck or mute
  // battle noise independently of world/building sounds.
  ['swordSwing','swordClang','hit','dashWhoosh','hitSpark','impactLite','bigImpact','gunShot',
   'giantStomp','fallWhistle','launch','chargeHorn','chargeWhoosh2','rumble','thunder','shing',
   'magicSpell','timeWarp','ghostOut','taiko','boomRamp','kaboom'
  ].forEach(k => { if (window.__sfx[k]) window.__sfx[k] = withChannel('combat', window.__sfx[k]); });
  ['babble','babbleWord'].forEach(k => { window.__sfx[k] = withChannel('voices', window.__sfx[k]); });
})();
