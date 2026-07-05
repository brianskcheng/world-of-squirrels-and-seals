/* =====================================================================
   WORLD — landscape, narration/subtitles, curtain, fx, food
   ===================================================================== */
(function () {
  const rand = SS.rand, pick = SS.pick;
  // rAF can stall in hidden/throttled tabs — style-flip transitions must use
  // a plain timer so end states ALWAYS apply.
  SS.tick = (fn) => setTimeout(fn, 20);
  const W = {};
  SS.world = W;

  /* ---------- geometry ---------- */
  W.vw = () => window.innerWidth;
  W.vh = () => window.innerHeight;
  W.groundTop = () => W.vh() * 0.62;
  W.groundBot = () => W.vh() * 0.92;
  W.depthScale = (y) => {
    const t = Math.max(0, Math.min(1, (y - W.groundTop()) / (W.groundBot() - W.groundTop())));
    return 0.62 + t * 0.5;
  };
  W.tidelineX = () => W.vw() * 0.52;
  W.randGround = (x0 = 0.04, x1 = 0.96) => ({
    x: rand(W.vw() * x0, W.vw() * x1),
    y: rand(W.groundTop() + 20, W.groundBot())
  });

  /* ---------- state & timers ---------- */
  W.state = 'playground';
  let timers = [];
  W.later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  W.rep = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  W.clearTimers = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; };
  W._skipHandler = null;
  W.skip = () => { if (W._skipHandler) W._skipHandler(); };

  /* ---------- landscape ---------- */
  function flower(x, y) {
    return `<g transform="translate(${x} ${y})" opacity="0.75">
      <path class="ink ink-thin" d="M 0 0 L 0 -9"/>
      <circle class="ink ink-thin" cx="0" cy="-12" r="3" fill="rgba(214,138,120,0.5)"/>
      <circle class="ink-fill" cx="0" cy="-12" r="1"/>
      <path class="ink ink-thin" d="M 0 -4 C 3 -5, 4 -7, 4 -8"/>
    </g>`;
  }
  function tuft(x, y) {
    return `<path class="ink ink-thin" d="M ${x} ${y} l -3 -9 m 5 9 l 1 -10 m 2 10 l 4 -8" opacity="0.55"/>`;
  }
  function shell(x, y, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.7">
      <path class="ink ink-thin" d="M -5 2 C -5 -4, 5 -4, 5 2 Z" fill="rgba(230,200,170,0.6)"/>
      <path class="ink ink-thin" d="M -2.5 1.5 L -2 -3 M 0 1.5 L 0 -3.6 M 2.5 1.5 L 2 -3"/>
    </g>`;
  }
  function rock(x, y, w, h) {
    return `<g transform="translate(${x} ${y})">
      <path class="ink" d="M ${-w/2} 0 C ${-w/2} ${-h}, ${w/2} ${-h}, ${w/2} 0 C ${w*0.3} ${h*0.18}, ${-w*0.3} ${h*0.18}, ${-w/2} 0 Z" fill="rgba(130,124,116,0.30)"/>
      <path class="ink ink-thin" d="M ${-w*0.25} ${-h*0.55} C ${-w*0.1} ${-h*0.7}, ${w*0.15} ${-h*0.65}, ${w*0.25} ${-h*0.45}" opacity="0.5"/>
    </g>`;
  }
  function cloud(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})" class="wave-drift2" opacity="0.55">
      <path class="ink ink-thin" d="M -40 10 C -52 10, -52 -6, -38 -6 C -36 -18, -16 -20, -10 -10 C -2 -20, 16 -18, 18 -6 C 32 -8, 36 8, 22 10 Z" fill="rgba(255,253,244,0.8)"/>
    </g>`;
  }

  function buildLandscape() {
    const host = document.getElementById('landscape');
    let flowers = '', tufts = '', shells = '';
    [[150,700],[420,650],[300,860],[620,760],[80,940],[520,980],[760,660],[860,900]].forEach(p => flowers += flower(p[0], p[1]));
    [[240,760],[500,700],[700,880],[120,830],[380,1000],[820,780],[940,700],[660,1010]].forEach(p => tufts += tuft(p[0], p[1]));
    [[1180,800],[1300,940],[1240,1030],[1420,870]].forEach(p => shells += shell(p[0], p[1], rand(0.9, 1.4)));

    host.innerHTML = `
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice">
      <!-- distant hills -->
      <path class="ink ink-thin" d="M -20 560 C 200 470, 420 500, 640 540 C 900 500, 1050 530, 1200 548" opacity="0.28" fill="none"/>
      <path class="ink ink-thin" d="M 1250 548 C 1450 500, 1700 520, 1940 545" opacity="0.22" fill="none"/>
      ${cloud(420, 190, 1.2)}${cloud(1050, 130, 0.9)}${cloud(1600, 240, 0.7)}

      <!-- meadow wash -->
      <path d="M -20 585 C 300 570, 700 575, 1010 585 C 1040 750, 1050 900, 1030 1090 L -20 1090 Z" fill="var(--grass)" stroke="none"/>
      <!-- sand -->
      <path d="M 1010 585 C 1200 578, 1500 578, 1940 585 L 1940 1090 L 1030 1090 C 1050 900, 1040 750, 1010 585 Z" fill="var(--sand)" stroke="none"/>
      <!-- sea (far right) -->
      <g>
        <path d="M 1400 588 C 1560 580, 1760 580, 1940 586 L 1940 1090 L 1560 1090 C 1470 900, 1430 740, 1400 588 Z" fill="var(--sea)" stroke="none"/>
        <g class="wave-drift">
          <path class="ink ink-thin" d="M 1450 680 q 20 -8 40 0 t 40 0 t 40 0" opacity="0.45" fill="none"/>
          <path class="ink ink-thin" d="M 1560 820 q 20 -8 40 0 t 40 0 t 40 0 t 40 0" opacity="0.45" fill="none"/>
        </g>
        <g class="wave-drift2">
          <path class="ink ink-thin" d="M 1500 950 q 22 -9 44 0 t 44 0 t 44 0" opacity="0.4" fill="none"/>
          <path class="ink ink-thin" d="M 1420 600 q 18 -7 36 0 t 36 0" opacity="0.4" fill="none"/>
        </g>
      </g>
      <!-- ground contour line -->
      <path class="ink" d="M -20 590 C 400 578, 900 582, 1300 584 C 1560 582, 1760 584, 1940 588" opacity="0.5" fill="none"/>
      <!-- tideline (where the wall will rise) -->
      <path class="ink ink-thin" d="M 1005 590 C 985 720, 1030 860, 995 1085" opacity="0.28" stroke-dasharray="7 9" fill="none"/>

      <!-- THE OLD OAK -->
      <g class="oak-sway" id="old-oak">
        <path class="ink" d="M 150 660 C 152 560, 148 470, 158 380 M 210 660 C 206 570, 214 480, 200 380" fill="none" stroke-width="3"/>
        <path d="M 150 660 C 152 560, 148 470, 158 380 L 200 380 C 214 480, 206 570, 210 660 Z" fill="rgba(120,84,50,0.22)" stroke="none"/>
        <path class="ink ink-thin" d="M 160 560 C 170 555, 182 556, 196 562 M 158 470 C 172 464, 186 466, 202 470" opacity="0.4" fill="none"/>
        <path class="ink" d="M 156 420 C 120 400, 90 360, 82 320 M 202 410 C 240 390, 268 356, 276 320 M 178 390 C 176 340, 178 300, 180 270" fill="none" stroke-width="2.6"/>
        <ellipse class="ink ink-thin" cx="181" cy="600" rx="12" ry="16" fill="rgba(60,40,26,0.5)"/>
        <path class="ink ink-thin" d="M 130 662 C 120 668, 108 672, 96 672 M 228 662 C 240 668, 252 672, 264 672" fill="none"/>
        <g>
          <path class="ink" d="M 80 330 C 30 320, 20 250, 70 235 C 60 175, 130 145, 175 170 C 200 120, 290 125, 305 180 C 360 175, 385 240, 340 270 C 370 320, 310 360, 265 340 C 240 380, 150 385, 125 345 C 100 365, 70 355, 80 330 Z" fill="rgba(122,138,64,0.30)"/>
          <path class="ink ink-thin" d="M 120 300 q 14 -10 28 0 M 190 250 q 14 -10 28 0 M 250 300 q 14 -10 28 0 M 160 210 q 13 -9 26 0" opacity="0.5" fill="none"/>
          <g opacity="0.85">${SS.acornSVG(150, 330, 0.8)}${SS.acornSVG(255, 345, 0.75)}${SS.acornSVG(210, 300, 0.7)}</g>
        </g>
      </g>

      <!-- lounging rocks in the shallows -->
      ${rock(1650, 760, 150, 68)}
      ${rock(1810, 900, 190, 84)}
      ${rock(1530, 1010, 150, 60)}

      <!-- a little bush mid-meadow -->
      <g transform="translate(760 610)">
        <path class="ink ink-thin" d="M -34 0 C -46 -2, -46 -22, -30 -22 C -30 -36, -6 -40, 2 -28 C 14 -38, 34 -30, 30 -16 C 42 -14, 42 0, 28 0 Z" fill="rgba(122,138,64,0.28)"/>
        <circle class="ink-fill" cx="-12" cy="-16" r="1.6" opacity="0.5"/><circle class="ink-fill" cx="8" cy="-20" r="1.6" opacity="0.5"/><circle class="ink-fill" cx="0" cy="-9" r="1.6" opacity="0.5"/>
      </g>
      ${flowers}${tufts}${shells}
    </svg>`;

    // stars for night mood
    const stars = document.getElementById('stars');
    let s = '';
    for (let i = 0; i < 26; i++) {
      s += `<span class="star" style="left:${rand(2, 97)}vw; top:${rand(2, 46)}vh; animation-delay:${rand(-2.6, 0).toFixed(2)}s">${pick(['✦','✧','⋆','·'])}</span>`;
    }
    stars.innerHTML = s;
  }

  /* ---------- subtitles + narration ---------- */
  const SPEAKER_LABELS = {
    narrator: 'Narrator', god: 'The Old Otter of the Estuary',
    child1: 'A Squirrel', child2: 'A Squirrel', flying: 'A Squirrel', healer: 'A Squirrel',
    water: 'A Seal', villager: 'A Seal', time: 'A Seal', spear: 'A Seal',
    giant: 'An Elder Seal', wizard: 'An Elder Squirrel'
  };
  const subtitleBar = document.getElementById('subtitle-bar');
  const subtitleText = document.getElementById('subtitle-text');
  const subtitleSpeaker = document.getElementById('subtitle-speaker');
  let subtitleHideTimer = null;
  let subtitlesEnabled = true;
  try { subtitlesEnabled = localStorage.getItem('wss-subtitles') !== 'off'; } catch (e) {}
  function showSubtitle(text, profileKey, opts) {
    if (!text || !subtitlesEnabled) { subtitleBar.classList.remove('show'); return; }
    subtitleText.textContent = text;
    subtitleSpeaker.textContent = (opts && opts.speakerLabel) || SPEAKER_LABELS[profileKey] || '';
    subtitleBar.classList.add('show');
    if (subtitleHideTimer) clearTimeout(subtitleHideTimer);
    subtitleHideTimer = setTimeout(() => subtitleBar.classList.remove('show'), Math.max(8000, 130 * text.length));
  }
  W.toggleSubtitles = () => {
    subtitlesEnabled = !subtitlesEnabled;
    try { localStorage.setItem('wss-subtitles', subtitlesEnabled ? 'on' : 'off'); } catch (e) {}
    if (!subtitlesEnabled) subtitleBar.classList.remove('show');
    return subtitlesEnabled;
  };
  if (window.__sfx && window.__sfx.setSubtitleCallback) {
    window.__sfx.setSubtitleCallback((text, profileKey, opts) => showSubtitle(text, profileKey, opts));
  }
  W.narrate = (text, profileKey = 'narrator', speakerLabel, onDone) => {
    if (window.__sfx) window.__sfx.speak(text, profileKey, { caption: true, speakerLabel, onDone });
    else {
      showSubtitle(text, profileKey, { speakerLabel });
      if (onDone) setTimeout(onDone, Math.max(1600, text.length * 60));
    }
  };
  W.stopSpeech = () => { if (window.__sfx && window.__sfx.stopSpeech) window.__sfx.stopSpeech(); };

  /* ---------- chapter chrome ---------- */
  const card = document.getElementById('chapter-card');
  const curtain = document.getElementById('curtain');
  W.showCard = (num, name, sub, dur = 2600) => {
    document.getElementById('ch-num').textContent = num;
    document.getElementById('ch-name').textContent = name;
    document.getElementById('ch-sub').textContent = sub;
    card.classList.add('show');
    if (window.__sfx) window.__sfx.chapterWhoosh();
    W.later(() => card.classList.remove('show'), dur);
  };
  W.curtainTransition = ({ num, name, sub, narration, profile = 'narrator', holdMs = 3400, onMid, onNarrated, onUp }) => {
    document.getElementById('curtain-num').textContent = num || '';
    document.getElementById('curtain-name').textContent = name || '';
    document.getElementById('curtain-sub').textContent = sub || '';
    curtain.classList.remove('exit');
    curtain.classList.add('show');
    if (window.__sfx) (window.__sfx.curtainDrop || window.__sfx.chapterWhoosh)();
    W.later(() => { if (onMid) onMid(); }, 700);
    if (narration) W.later(() => W.narrate(narration, profile, null, onNarrated), 900);
    W.later(() => {
      curtain.classList.add('exit');
      if (window.__sfx && window.__sfx.curtainLift) window.__sfx.curtainLift();
    }, holdMs);
    W.later(() => { curtain.classList.remove('show'); curtain.classList.remove('exit'); if (onUp) onUp(); }, holdMs + 750);
  };
  W.setMood = (mood) => {
    ['mood-build','mood-war','mood-dusk','mood-night','mood-dawn'].forEach(m => document.body.classList.remove(m));
    if (mood) document.body.classList.add('mood-' + mood);
  };
  W.banner = (title, sub) => {
    const b = document.getElementById('saga-banner');
    if (!title) { b.style.display = 'none'; return; }
    document.getElementById('banner-title').textContent = title;
    document.getElementById('banner-sub').textContent = sub || '';
    b.style.display = 'block';
  };
  W.clock = (big, sub) => {
    const c = document.getElementById('saga-clock');
    if (big == null) { c.style.display = 'none'; return; }
    c.style.display = 'block';
    document.getElementById('clock-big').textContent = big;
    document.getElementById('clock-sub').textContent = sub || '';
  };
  let warBannerT = null;
  W.warBanner = (big, small, ms = 2200) => {
    const b = document.getElementById('war-banner');
    b.innerHTML = `${big}<small>${small || ''}</small>`;
    b.classList.add('show');
    if (window.__sfx) window.__sfx.taiko(0.8);
    if (warBannerT) clearTimeout(warBannerT);
    warBannerT = setTimeout(() => b.classList.remove('show'), ms);
  };
  W.showMsg = (html, small) => {
    const m = document.getElementById('saga-message');
    m.innerHTML = html + (small ? `<span class="small">${small}</span>` : '');
    m.classList.add('show');
  };
  W.hideMsg = () => document.getElementById('saga-message').classList.remove('show');
  W.showChoices = (list) => { // [{label, small, fn}]
    const row = document.getElementById('choice-row');
    row.innerHTML = '';
    list.forEach(ch => {
      const b = document.createElement('button');
      b.className = 'choice-btn';
      b.innerHTML = `${ch.label}<small>${ch.small || ''}</small>`;
      b.addEventListener('click', () => { row.classList.remove('on'); ch.fn(); });
      row.appendChild(b);
    });
    row.classList.add('on');
  };
  W.hideChoices = () => document.getElementById('choice-row').classList.remove('on');
  W.flash = () => {
    const f = document.getElementById('flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  };
  W.shake = () => {
    document.body.classList.remove('shaking'); void document.body.offsetWidth;
    document.body.classList.add('shaking');
    setTimeout(() => document.body.classList.remove('shaking'), 550);
  };
  let hitstopUntil = 0;
  W.hitstop = (ms) => {
    hitstopUntil = Math.max(hitstopUntil, performance.now() + ms);
    document.body.classList.add('hitstop');
    setTimeout(() => { if (performance.now() >= hitstopUntil - 8) document.body.classList.remove('hitstop'); }, ms + 12);
  };

  /* ---------- fx ---------- */
  const fxL = document.getElementById('fx-layer');
  const fx = {};
  SS.fx = fx;
  function abs(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; fxL.appendChild(el); return el; }
  fx.heart = (x, y) => {
    const d = document.createElement('div');
    d.className = 'fx-abs heart-fx'; d.textContent = pick(['♥','♡']);
    abs(d, x, y); setTimeout(() => d.remove(), 1050);
  };
  fx.zzz = (x, y) => {
    const d = document.createElement('div');
    d.className = 'fx-abs zzz-fx'; d.textContent = 'z z ᶻ';
    abs(d, x, y); setTimeout(() => d.remove(), 2250);
  };
  fx.crumbs = (x, y, n = 4) => {
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'crumb';
      d.style.setProperty('--dx', rand(-12, 12) + 'px');
      abs(d, x + rand(-4, 4), y);
      setTimeout(() => d.remove(), 720);
    }
  };
  fx.dust = (x, y, n = 3, size = [8, 20]) => {
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'dust-puff';
      const s = rand(size[0], size[1]);
      d.style.width = s + 'px'; d.style.height = s * 0.7 + 'px';
      abs(d, x + rand(-14, 14), y + rand(-6, 2));
      setTimeout(() => d.remove(), 520);
    }
  };
  fx.ripple = (x, y) => {
    const d = document.createElement('div');
    d.className = 'ripple-fx';
    const s = rand(26, 44);
    d.style.width = s + 'px'; d.style.height = s * 0.5 + 'px';
    abs(d, x - s / 2, y - s * 0.25); setTimeout(() => d.remove(), 820);
  };
  fx.splash = (x, y, n = 6) => {
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'splash-drop';
      d.style.setProperty('--dx', rand(-26, 26) + 'px');
      d.style.setProperty('--dy', rand(10, 34) + 'px');
      abs(d, x + rand(-6, 6), y - rand(2, 14));
      setTimeout(() => d.remove(), 580);
    }
    if (window.__sfx && Math.random() < 0.6) window.__sfx.waterSplash();
  };
  fx.dmgPop = (x, y, text, crit, heal) => {
    const d = document.createElement('div');
    d.className = 'dmg-pop' + (crit ? ' crit' : '') + (heal ? ' heal' : '');
    d.textContent = text;
    abs(d, x - 14, y - 10); setTimeout(() => d.remove(), 720);
  };
  function spikePts(n, rO, rI) {
    const p = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? rO : rI;
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      p.push((Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1));
    }
    return p.join(' ');
  }
  fx.impactStar = (x, y, size = 44) => {
    const d = document.createElement('div');
    d.className = 'hit-star';
    d.style.width = size + 'px'; d.style.height = size + 'px';
    d.innerHTML = `<svg viewBox="-60 -60 120 120" style="overflow:visible">
      <polygon points="${spikePts(9, 56, 20)}" fill="#fff6dd" stroke="#3a2218" stroke-width="4"/>
      <polygon points="${spikePts(9, 30, 12)}" fill="none" stroke="#3a2218" stroke-width="2"/>
    </svg>`;
    d.style.transform = 'scale(.25)'; d.style.opacity = '0';
    d.style.transition = 'transform .12s cubic-bezier(.2,1.4,.4,1), opacity .08s';
    abs(d, x - size / 2, y - size / 2);
    SS.tick(() => { d.style.transform = 'scale(1) rotate(10deg)'; d.style.opacity = '1'; });
    setTimeout(() => { d.style.transition = 'transform .14s ease-in, opacity .14s'; d.style.transform = 'scale(1.3) rotate(16deg)'; d.style.opacity = '0'; }, 130);
    setTimeout(() => d.remove(), 300);
  };
  fx.afterimage = (c) => {
    if (!c || !c.el.isConnected) return;
    const r = c.el.getBoundingClientRect();
    const g = document.createElement('div');
    g.className = 'afterimage' + (c.dir === 'l' ? ' face-l' : '');
    g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
    g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
    g.innerHTML = `<svg viewBox="0 0 120 120" style="${c.dir === 'l' ? 'transform:scaleX(-1)' : ''}">${SS.critterMarkup(c.species, c.variant).replace(/<\/?svg[^>]*>/g, '')}</svg>`;
    g.style.opacity = '0.3'; g.style.transition = 'opacity .22s linear';
    fxL.appendChild(g);
    SS.tick(() => { g.style.opacity = '0'; });
    setTimeout(() => g.remove(), 240);
  };
  fx.dashTrail = (c, n = 3, span = 140) => {
    for (let i = 0; i < n; i++) setTimeout(() => fx.afterimage(c), i * (span / n));
  };
  fx.ring = (c, heal) => {
    const ring = document.createElement('div');
    ring.className = 'rally-ring' + (heal ? ' heal' : '');
    c.el.appendChild(ring);
    setTimeout(() => ring.remove(), 820);
  };

  /* projectile lob — quadratic arc from a to b */
  const PROJ_ART = {
    acorn: () => `<svg viewBox="-12 -12 24 24">${SS.acornSVG(0, -2, 1.1)}</svg>`,
    fish: (ang) => `<svg viewBox="-14 -14 28 28">${SS.fishSVG(0, 0, 1.1, ang)}</svg>`,
    drop: () => `<svg viewBox="-12 -12 24 24"><path class="ink ink-thin" d="M 0 -9 C 5 -3, 7 1, 7 4 A 7 7 0 1 1 -7 4 C -7 1, -5 -3, 0 -9 Z" fill="rgba(94,127,153,0.55)"/></svg>`,
    pinecone: () => `<svg viewBox="-12 -12 24 24"><path class="ink ink-thin" d="M 0 -8 C 6 -6, 8 2, 4 8 L -4 8 C -8 2, -6 -6, 0 -8 Z" fill="rgba(120,84,50,0.45)"/><path class="ink ink-thin" d="M -5 -2 L 5 -2 M -6 2 L 6 2 M -4 5.5 L 4 5.5"/></svg>`,
    berry: () => `<svg viewBox="-12 -12 24 24"><circle class="ink ink-thin" r="5" fill="rgba(190,80,80,0.55)"/><path class="ink ink-thin" d="M 0 -5 C 1 -8, 3 -9, 5 -9"/></svg>`,
    snowball: () => `<svg viewBox="-12 -12 24 24"><circle class="ink ink-thin" r="6" fill="rgba(240,248,252,0.9)"/><path class="ink ink-thin" d="M -3 -1 L -1 -3 M 1 2 L 3 0" opacity="0.5"/></svg>`
  };
  fx.lob = (kind, x1, y1, x2, y2, opts = {}) => {
    const d = document.createElement('div');
    d.className = 'proj' + (opts.spin ? ' spin' : '');
    const sz = opts.size || 26;
    d.style.width = sz + 'px'; d.style.height = sz + 'px';
    const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    d.innerHTML = (PROJ_ART[kind] || PROJ_ART.acorn)(ang);
    fxL.appendChild(d);
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const dur = opts.dur || Math.max(200, dist / (opts.speed || 620) * 1000);
    const arc = opts.arc != null ? opts.arc : Math.min(120, dist * 0.3);
    const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - arc;
    const t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      d.remove();
      if (opts.onHit) opts.onHit(x2, y2);
    };
    // rAF can pause when the tab is hidden — this backstop keeps the story
    // moving no matter what.
    setTimeout(finish, dur + 900);
    function step(ts) {
      if (finished) return;
      const t = Math.min(1, (ts - t0) / dur);
      const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      d.style.left = (x - sz / 2) + 'px';
      d.style.top = (y - sz / 2) + 'px';
      if (t < 1) requestAnimationFrame(step);
      else finish();
    }
    requestAnimationFrame(step);
    return d;
  };

  /* ---------- food ---------- */
  const foodL = document.getElementById('food-layer');
  W.foods = [];
  W.spawnFood = (kind, x, y) => {
    const d = document.createElement('div');
    d.className = 'fx-abs';
    const sz = 26 * W.depthScale(y);
    d.style.width = sz + 'px'; d.style.height = sz + 'px';
    d.style.left = (x - sz / 2) + 'px'; d.style.top = (y - sz * 0.8) + 'px';
    d.style.zIndex = String(9 + Math.round(y / 4) - 1);
    d.innerHTML = kind === 'acorn'
      ? `<svg viewBox="-12 -12 24 24" style="overflow:visible">${SS.acornSVG(0, -3, 1.2)}<path class="ink ink-thin" d="M -8 9 L 8 9" opacity="0.25"/></svg>`
      : `<svg viewBox="-14 -14 28 28" style="overflow:visible">${SS.fishSVG(0, 0, 1.2, -8)}<path class="ink ink-thin" d="M -9 8 L 9 8" opacity="0.25"/></svg>`;
    d.style.transform = 'scale(0)';
    d.style.transition = 'transform .3s cubic-bezier(.3,1.6,.5,1)';
    foodL.appendChild(d);
    SS.tick(() => { d.style.transform = `scale(1) rotate(${rand(-14, 14)}deg)`; });
    const f = { el: d, kind, x, y, taken: false };
    W.foods.push(f);
    return f;
  };
  W.takeFood = (f) => {
    if (!f || f.taken) return false;
    f.taken = true;
    f.el.style.transition = 'transform .25s ease, opacity .25s ease';
    f.el.style.transform = 'scale(0)'; f.el.style.opacity = '0';
    setTimeout(() => f.el.remove(), 260);
    W.foods = W.foods.filter(x => x !== f);
    return true;
  };
  W.nearestFood = (kind, x, y, maxDist = 1e9) => {
    let best = null, bd = maxDist;
    W.foods.forEach(f => {
      if (f.taken || (kind && f.kind !== kind)) return;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f; }
    });
    return best;
  };
  W.clearFood = () => { W.foods.forEach(f => f.el.remove()); W.foods = []; };

  /* Shared eat routine: walk to food, munch it, then callback */
  W.eatFood = (c, f, cb) => {
    if (!f || f.taken) { if (cb) cb(); return; }
    f.claimed = true;
    c.moveTo(f.x + (c.species === 'sl' ? -c.size * 0.18 : 0), f.y, c.species === 'sq' ? 130 : 80, () => {
      if (f.taken || !c.alive) { if (cb) cb(); return; }
      W.takeFood(f);
      c.showItem('food');
      c.setAction('eat');
      const r = () => c.el.getBoundingClientRect();
      if (c.species === 'sq') {
        const munch = W.rep(() => {
          const b = r();
          SS.fx.crumbs(b.left + b.width * 0.62, b.top + b.height * 0.55);
          if (window.__sfx && Math.random() < 0.5) window.__sfx.woodKnock(420);
        }, 260);
        W.later(() => {
          clearInterval(munch);
          c.showItem(null); c.setAction('idle');
          c.flashFace('happy', 'smile', 1400);
          if (Math.random() < 0.4) c.say(pick(['nom nom!','crunch~','so nutty!','mmm!']), 1400);
          if (cb) cb();
        }, rand(2200, 3400));
      } else {
        // seal: toss the fish up, catch, gulp
        c.showItem(null);
        const b = r();
        SS.fx.lob('fish', b.left + b.width * 0.7, b.top + b.height * 0.5, b.left + b.width * 0.66, b.top + b.height * 0.42, {
          arc: 70, dur: 640, spin: true,
          onHit: () => {
            if (!c.alive) { if (cb) cb(); return; }
            c.setAction('eat');
            c.flashFace('closed', 'open', 900);
            if (window.__sfx) window.__sfx.pop();
            W.later(() => {
              c.setAction('idle');
              c.flashFace('happy', 'smile', 1500);
              if (Math.random() < 0.4) c.say(pick(['gulp!','arf!','yum yum','fresh!']), 1400);
              if (cb) cb();
            }, 1000);
          }
        });
        c.flashFace('happy', 'o', 1600);
      }
    });
  };

  /* ---------- critter registry ---------- */
  W.critters = [];
  W.addCritter = (opts) => {
    const c = SS.makeCritter(opts);
    document.getElementById('critter-layer').appendChild(c.el);
    W.critters.push(c);
    return c;
  };
  W.removeCritter = (c) => {
    c.remove();
    W.critters = W.critters.filter(x => x !== c);
  };
  W.clearCritters = () => { W.critters.forEach(c => c.remove()); W.critters = []; };

  W.init = () => { buildLandscape(); };
})();
