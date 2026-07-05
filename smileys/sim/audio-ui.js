/* =====================================================================
   SOUND STUDIO — master + per-channel mixer, narrator tuning, previews.
   window.SIM.audioUI — settings persist in localStorage ('sim-audio-v1').
   ===================================================================== */
window.SIM = window.SIM || {};
(function () {
  const KEY = 'sim-audio-v1';
  const CHANS = ['voices', 'narrator', 'music', 'combat', 'world'];
  const DEF = {
    master: { vol: 1, muted: false },
    ch: {
      voices:   { vol: 1, muted: false },
      narrator: { vol: 1, muted: false },
      music:    { vol: 0.9, muted: false },
      combat:   { vol: 1, muted: false },
      world:    { vol: 1, muted: false }
    },
    narr: { rate: 1, pitch: 1 }
  };
  const LABELS = {
    voices: 'Voices',
    narrator: 'Narrator',
    music: 'Music',
    combat: 'Combat',
    world: 'World'
  };
  const TESTS = {
    voices:   (f) => f.speakRandom('hello there'),
    narrator: (f) => f.speak('Once upon a time', 'narrator', { caption: false }),
    music:    (f) => {
      f.startMusic('playground');
      setTimeout(() => { try { f.stopMusic(); } catch (e) {} }, 2500);
    },
    combat:   (f) => { if (f.swordClang) f.swordClang(); else if (f.hitSpark) f.hitSpark(); },
    world:    (f) => f.pop()
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    Object.keys(base).forEach((k) => {
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], over[k]);
      else if (over[k] != null && typeof over[k] === typeof base[k]) base[k] = over[k];
    });
    return base;
  }

  let S = clone(DEF);
  try { merge(S, JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) {}

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function apply() {
    try {
      const fx = window.__sfx;
      if (!fx) return;
      if (fx.setMasterVolume) fx.setMasterVolume(S.master.vol);
      if (fx.setMuted) fx.setMuted(S.master.muted);
      if (fx.setChannel) CHANS.forEach((k) => fx.setChannel(k, S.ch[k]));
      if (fx.setNarratorTune) fx.setNarratorTune(S.narr);
    } catch (e) {}
  }

  const poke = (fn) => {
    try {
      const f = window.__sfx;
      if (!f) return;
      if (f.unlock) f.unlock();
      fn(f);
    } catch (e) {}
  };

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }
  const pct = (v) => Math.round(v * 100) + '%';
  const times = (v) => (Math.round(v * 100) / 100) + '×';

  function audRow(parent, label, min, max, step, get, set, fmt) {
    const r = el(`<div class="aud-row"><label>${label}</label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${get()}">
      <span class="val">${fmt(get())}</span></div>`);
    const inp = r.querySelector('input'), val = r.querySelector('.val');
    inp.addEventListener('input', () => {
      set(+inp.value);
      val.textContent = fmt(+inp.value);
      apply();
      save();
    });
    parent.appendChild(r);
  }

  function channelBlock(parent, key) {
    const st = S.ch[key];
    const g = el(`<div class="aud-group"><div class="aud-head"><h4>${LABELS[key]}</h4>
      <label class="aud-mute-lbl"><input type="checkbox"${st.muted ? ' checked' : ''}> mute</label></div></div>`);
    const cb = g.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', () => {
      st.muted = cb.checked;
      apply();
      save();
    });
    audRow(g, 'volume', 0, 1, 0.05, () => st.vol, (v) => { st.vol = v; }, pct);
    if (key === 'narrator') {
      audRow(g, 'reading pace', 0.6, 1.6, 0.05, () => S.narr.rate, (v) => { S.narr.rate = v; }, times);
      audRow(g, 'voice depth', 0.6, 1.6, 0.05, () => S.narr.pitch, (v) => { S.narr.pitch = v; }, times);
    }
    const tb = el(`<button type="button" class="st-chip gm-btn aud-test">▶ test</button>`);
    tb.addEventListener('click', () => poke(TESTS[key]));
    g.appendChild(tb);
    parent.appendChild(g);
  }

  function render(body, back) {
    body.innerHTML = '';
    body.appendChild(el(`<div class="gm-sec-head"><button type="button" class="gm-back" id="aud-back">← menu</button>
      <div class="gm-sec-title">Sound Studio</div>
      <span class="gm-note">every knob applies instantly &amp; is remembered</span></div>`));
    body.querySelector('#aud-back').addEventListener('click', back);

    const master = el(`<div class="aud-master"><b style="font-size:22px">Master</b></div>`);
    body.appendChild(master);
    const mr = el(`<input type="range" min="0" max="1.5" step="0.05" value="${S.master.vol}">`);
    const mv = el(`<span style="font-weight:700;width:52px;text-align:right;font-size:17px">${pct(S.master.vol)}</span>`);
    master.appendChild(mr);
    master.appendChild(mv);
    mr.addEventListener('input', () => {
      S.master.vol = +mr.value;
      mv.textContent = pct(S.master.vol);
      apply();
      save();
    });
    const mm = el(`<button type="button" class="st-chip aud-mute${S.master.muted ? ' sel' : ''}">${S.master.muted ? 'muted' : 'on'}</button>`);
    mm.addEventListener('click', () => {
      S.master.muted = !S.master.muted;
      mm.classList.toggle('sel', S.master.muted);
      mm.textContent = S.master.muted ? 'muted' : 'on';
      apply();
      save();
    });
    master.appendChild(mm);

    const grid = el(`<div class="aud-grid"></div>`);
    body.appendChild(grid);
    CHANS.forEach((k) => channelBlock(grid, k));

    const foot = el(`<div class="gm-foot"><span class="gm-note">sounds still play while this menu is open</span>
      <button type="button" class="hand-btn warn gm-btn" id="aud-reset">reset to defaults</button></div>`);
    body.appendChild(foot);
    foot.querySelector('#aud-reset').addEventListener('click', () => {
      S = clone(DEF);
      apply();
      save();
      render(body, back);
    });
  }

  function open() {
    try {
      if (SIM.game && SIM.game.show) SIM.game.show('audio');
    } catch (e) {}
  }

  SIM.audioUI = { init: apply, render, open };
})();
