/* =====================================================================
   SOUND STUDIO — full audio control: master + per-channel mixer,
   squirrel/seal voice tuning, narrator voice, previews & a soundboard.
   window.SS.audio — settings persist in localStorage ('wss-audio-v1').
   ===================================================================== */
window.SS = window.SS || {};
(function () {
  const KEY = 'wss-audio-v1';
  const DEF = {
    master: { vol: 1, muted: false },
    ch: {
      squirrels: { vol: 1, muted: false },
      seals:     { vol: 1, muted: false },
      narrator:  { vol: 1, muted: false },
      music:     { vol: 1, muted: false },
      combat:    { vol: 1, muted: false },
      world:     { vol: 1, muted: false }
    },
    sq: { pitch: 1, speed: 1, trill: 1, length: 1 },
    sl: { pitch: 1, speed: 1, gravel: 1, boom: 1, length: 1 },
    narr: { rate: 1, pitch: 1 }
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    Object.keys(base).forEach((k) => {
      if (base[k] && typeof base[k] === 'object') merge(base[k], over[k]);
      else if (over[k] != null && typeof over[k] === typeof base[k]) base[k] = over[k];
    });
    return base;
  }
  let S = clone(DEF);
  try { merge(S, JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function apply() {
    const fx = window.__sfx; if (!fx) return;
    if (fx.setMasterVolume) fx.setMasterVolume(S.master.vol);
    if (fx.setMuted) fx.setMuted(S.master.muted);
    if (fx.setChannel) Object.keys(S.ch).forEach((k) => fx.setChannel(k, S.ch[k]));
    if (fx.setAnimalTuning) fx.setAnimalTuning({ sq: S.sq, sl: S.sl });
    if (fx.setNarratorTune) fx.setNarratorTune(S.narr);
    const b = document.getElementById('btn-mute');
    if (b) b.textContent = S.master.muted ? '🔇 Sound' : '🔊 Sound';
  }
  const poke = (fn) => { const f = window.__sfx; if (f) { f.unlock(); fn(f); } };

  /* ---------- tiny DOM helpers ---------- */
  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  const pct = (v) => Math.round(v * 100) + '%';
  const times = (v) => (Math.round(v * 100) / 100) + '×';

  function row(parent, label, min, max, step, get, set, fmt) {
    const r = el(`<div class="prm-row"><label>${label}</label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${get()}">
      <span class="val">${fmt(get())}</span></div>`);
    const inp = r.querySelector('input'), val = r.querySelector('.val');
    inp.addEventListener('input', () => {
      set(+inp.value); val.textContent = fmt(+inp.value);
      apply(); save();
    });
    parent.appendChild(r);
  }
  function muteChip(parent, get, set) {
    const b = el(`<button class="st-chip aud-mute">${get() ? '🔇 muted' : '🔊 on'}</button>`);
    if (get()) b.classList.add('sel');
    b.addEventListener('click', () => {
      set(!get());
      b.classList.toggle('sel', get());
      b.textContent = get() ? '🔇 muted' : '🔊 on';
      apply(); save();
    });
    parent.appendChild(b);
  }
  function prevRow(parent, btns) {
    const r = el(`<div class="aud-prev"></div>`);
    btns.forEach(([label, fn]) => {
      const b = el(`<button class="st-chip">${label}</button>`);
      b.addEventListener('click', () => poke(fn));
      r.appendChild(b);
    });
    parent.appendChild(r);
  }
  function group(parent, title, note) {
    const g = el(`<div class="aud-group"><div class="aud-head"><h4>${title}</h4></div>${note ? `<div class="gm-note">${note}</div>` : ''}</div>`);
    parent.appendChild(g);
    return { root: g, head: g.querySelector('.aud-head') };
  }

  /* ---------- render (a section inside the game menu) ---------- */
  function render(body, back) {
    body.innerHTML = '';
    body.appendChild(el(`<div class="gm-sec-head"><button class="gm-back" id="aud-back">← menu</button>
      <div class="gm-sec-title">Sound Studio</div>
      <span class="gm-note">every knob applies instantly &amp; is remembered</span></div>`));
    body.querySelector('#aud-back').addEventListener('click', back);

    // master strip
    const master = el(`<div class="aud-master"><b style="font-size:22px">Master</b></div>`);
    body.appendChild(master);
    const mr = el(`<input type="range" min="0" max="1.5" step="0.05" value="${S.master.vol}">`);
    const mv = el(`<span style="font-weight:700;width:52px;text-align:right;font-size:17px">${pct(S.master.vol)}</span>`);
    master.appendChild(mr); master.appendChild(mv);
    mr.addEventListener('input', () => { S.master.vol = +mr.value; mv.textContent = pct(S.master.vol); apply(); save(); });
    muteChip(master, () => S.master.muted, (v) => S.master.muted = v);

    const grid = el(`<div class="aud-grid"></div>`);
    body.appendChild(grid);

    { // squirrels
      const g = group(grid, '🐿 Squirrel voices', 'kuk-kuk chirps &amp; rattle-trills');
      muteChip(g.head, () => S.ch.squirrels.muted, (v) => S.ch.squirrels.muted = v);
      row(g.root, 'volume', 0, 1.5, 0.05, () => S.ch.squirrels.vol, (v) => S.ch.squirrels.vol = v, pct);
      row(g.root, 'squeak pitch', 0.5, 2, 0.05, () => S.sq.pitch, (v) => S.sq.pitch = v, times);
      row(g.root, 'chatter speed', 0.5, 2, 0.05, () => S.sq.speed, (v) => S.sq.speed = v, times);
      row(g.root, 'rattle-trill amount', 0, 2, 0.1, () => S.sq.trill, (v) => S.sq.trill = v, times);
      row(g.root, 'call length', 0.5, 2, 0.1, () => S.sq.length, (v) => S.sq.length = v, times);
      prevRow(g.root, [
        ['▶ chitter', (f) => f.speakAnimal('sq', 'hey hey hey', 'child1')],
        ['▶ long rattle', (f) => f.speakAnimal('sq', 'this is my favourite acorn ever', 'flying')],
        ['▶ asking?', (f) => f.speakAnimal('sq', 'acorns?', 'child2')],
        ['▶ elder', (f) => f.speakAnimal('sq', 'back in my day...', 'wizard')]
      ]);
    }
    { // seals
      const g = group(grid, '🦭 Seal voices', 'gravelly arf-arf barks');
      muteChip(g.head, () => S.ch.seals.muted, (v) => S.ch.seals.muted = v);
      row(g.root, 'volume', 0, 1.5, 0.05, () => S.ch.seals.vol, (v) => S.ch.seals.vol = v, pct);
      row(g.root, 'bark pitch', 0.5, 2, 0.05, () => S.sl.pitch, (v) => S.sl.pitch = v, times);
      row(g.root, 'bark pace', 0.5, 2, 0.05, () => S.sl.speed, (v) => S.sl.speed = v, times);
      row(g.root, 'gravel', 0, 2, 0.1, () => S.sl.gravel, (v) => S.sl.gravel = v, times);
      row(g.root, 'chest boom', 0, 2, 0.1, () => S.sl.boom, (v) => S.sl.boom = v, times);
      row(g.root, 'call length', 0.5, 2, 0.1, () => S.sl.length, (v) => S.sl.length = v, times);
      prevRow(g.root, [
        ['▶ arf', (f) => f.speakAnimal('sl', 'hey', 'water')],
        ['▶ arf arf!', (f) => f.speakAnimal('sl', 'over here you lot!', 'villager')],
        ['▶ asking?', (f) => f.speakAnimal('sl', 'fish?', 'time')],
        ['▶ elder bull', (f) => f.speakAnimal('sl', 'ENOUGH of this racket!', 'giant')]
      ]);
    }
    { // narrator
      const g = group(grid, '🎙 Narrator', 'the storyteller — real spoken voice');
      muteChip(g.head, () => S.ch.narrator.muted, (v) => S.ch.narrator.muted = v);
      row(g.root, 'volume', 0, 1, 0.05, () => S.ch.narrator.vol, (v) => S.ch.narrator.vol = v, pct);
      row(g.root, 'reading pace', 0.6, 1.6, 0.05, () => S.narr.rate, (v) => S.narr.rate = v, times);
      row(g.root, 'voice depth', 0.6, 1.5, 0.05, () => S.narr.pitch, (v) => S.narr.pitch = v, times);
      prevRow(g.root, [
        ['▶ read a line', (f) => f.speak('The meadow held its breath, and so did the shore.', 'narrator', { caption: true })]
      ]);
    }
    { // music
      const g = group(grid, '🎵 Music', 'takes hold on whatever tune is playing');
      muteChip(g.head, () => S.ch.music.muted, (v) => S.ch.music.muted = v);
      row(g.root, 'volume', 0, 1.5, 0.05, () => S.ch.music.vol, (v) => S.ch.music.vol = v, pct);
      prevRow(g.root, [
        ['▶ meadow tune', (f) => f.startMusic('playground', { volume: 0.3 })],
        ['▶ battle tune', (f) => f.startMusic('battle', { volume: 0.4 })],
        ['■ stop music', (f) => f.stopMusic()]
      ]);
    }
    { // fighting
      const g = group(grid, '⚔ Fighting effects', 'bonks, whooshes, war drums, kabooms');
      muteChip(g.head, () => S.ch.combat.muted, (v) => S.ch.combat.muted = v);
      row(g.root, 'volume', 0, 1.5, 0.05, () => S.ch.combat.vol, (v) => S.ch.combat.vol = v, pct);
      prevRow(g.root, [
        ['▶ bonk', (f) => f.hit()],
        ['▶ whoosh', (f) => f.dashWhoosh(1.1)],
        ['▶ KABOOM', (f) => f.kaboom(1)]
      ]);
    }
    { // world
      const g = group(grid, '🌿 World effects', 'building, splashes, chimes, curtains');
      muteChip(g.head, () => S.ch.world.muted, (v) => S.ch.world.muted = v);
      row(g.root, 'volume', 0, 1.5, 0.05, () => S.ch.world.vol, (v) => S.ch.world.vol = v, pct);
      prevRow(g.root, [
        ['▶ hammer', (f) => f.woodKnock(300)],
        ['▶ splash', (f) => f.waterSplash()],
        ['▶ chime', (f) => f.healChime()]
      ]);
    }

    // soundboard
    const sb = el(`<div class="aud-group aud-wide"><div class="aud-head"><h4>🎛 Soundboard</h4>
      <span class="gm-note">poke a sound — each plays through its channel above</span></div><div class="sb-grid"></div></div>`);
    body.appendChild(sb);
    const sg = sb.querySelector('.sb-grid');
    [
      ['🐿 chitter', (f) => f.speakAnimal('sq', 'kuk kuk kuk!', 'child1')],
      ['🐿 trill', (f) => f.speakAnimal('sq', 'whrrrrr what a day', 'healer')],
      ['🦭 arf!', (f) => f.speakAnimal('sl', 'arf!', 'water')],
      ['🦭 big bull', (f) => f.speakAnimal('sl', 'MINE! ALL MINE!', 'giant')],
      ['👊 bonk', (f) => f.hit()],
      ['💨 whoosh', (f) => f.dashWhoosh(1.2)],
      ['✨ spark', (f) => f.hitSpark()],
      ['🦶 stomp', (f) => f.giantStomp()],
      ['🥁 taiko', (f) => f.taiko(0.8)],
      ['📯 war horn', (f) => f.chargeHorn()],
      ['⚡ thunder', (f) => f.thunder()],
      ['💥 kaboom', (f) => f.kaboom(1.2)],
      ['🔨 build', (f) => f.woodKnock(280)],
      ['🪨 stone', (f) => f.stoneSet()],
      ['⚒ anvil', (f) => f.anvilClang()],
      ['💧 splash', (f) => f.waterSplash()],
      ['🔔 chime', (f) => f.healChime()],
      ['🌟 sparkle', (f) => f.sparkleShimmer()],
      ['🎺 fanfare', (f) => f.fanfare()],
      ['🕊 choir', (f) => f.divineChoir()]
    ].forEach(([label, fn]) => {
      const b = el(`<button class="st-chip sb-btn">${label}</button>`);
      b.addEventListener('click', () => poke(fn));
      sg.appendChild(b);
    });

    // reset
    const foot = el(`<div class="gm-foot"><span class="gm-note">sounds still play while this menu is open — try things live</span>
      <button class="hand-btn warn" id="aud-reset">↺ reset all sound settings</button></div>`);
    body.appendChild(foot);
    foot.querySelector('#aud-reset').addEventListener('click', () => {
      S = clone(DEF); apply(); save(); render(body, back);
    });
  }

  SS.audio = {
    init: apply,
    render,
    open: () => { if (SS.game && SS.game.show) SS.game.show('audio'); }
  };
})();
