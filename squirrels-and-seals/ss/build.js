/* =====================================================================
   CHAPTER TWO — Build Season
   An acorn stash goes missing; the tideline goes cold; both tribes
   build homes, stores, defenses — and finally the Driftwood Wall.
   Narration-driven: the day clock glides while each line is spoken.
   ===================================================================== */
(function () {
  const rand = SS.rand, pick = SS.pick;
  const W = SS.world;
  const B = {};
  SS.build = B;

  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const rep = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  const clearAll = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; };

  SS.tribes = { west: [], east: [] };
  SS.structs = [];

  /* ---------------- structures ---------------- */
  const ART = {
    hut: (w) => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <path class="ink" d="M 18 118 C 18 70, 48 44, 70 44 C 92 44, 122 70, 122 118 Z" fill="rgba(150,108,60,0.20)"/>
      <path class="ink ink-thin" d="M 26 104 C 40 92, 100 92, 114 104 M 34 88 C 48 78, 92 78, 106 88 M 46 72 C 56 64, 84 64, 94 72" opacity="0.6"/>
      <path class="ink ink-thin" d="M 22 118 l 8 -5 m 10 5 l 9 -6 m 62 6 l 9 -5 m -26 5 l 8 -4" opacity="0.5"/>
      <path class="ink" d="M 56 118 C 56 96, 84 96, 84 118" fill="rgba(60,40,26,0.35)"/>
      <path class="ink ink-thin" d="M 64 50 l -6 -12 M 76 50 l 7 -11" />
      ${SS.acornSVG(70, 34, 0.9)}
    </svg>`,
    silo: () => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <path class="ink" d="M 44 118 C 36 100, 36 74, 46 58 L 94 58 C 104 74, 104 100, 96 118 Z" fill="rgba(199,144,62,0.18)"/>
      <path class="ink" d="M 40 58 C 52 46, 88 46, 100 58" fill="rgba(120,84,50,0.3)"/>
      <path class="ink ink-thin" d="M 46 74 L 94 74 M 44 92 L 96 92 M 46 106 L 94 106" opacity="0.45"/>
      ${SS.acornSVG(58, 66, 0.8)}${SS.acornSVG(74, 64, 0.85)}${SS.acornSVG(86, 67, 0.7)}
      <path class="ink ink-thin" d="M 70 46 L 70 36 M 70 36 C 74 32, 80 32, 82 36" />
    </svg>`,
    lookout: () => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <path class="ink" d="M 62 118 L 66 40 M 78 118 L 74 40" fill="none"/>
      <path class="ink ink-thin" d="M 64 100 L 76 100 M 65 82 L 75 82 M 66 64 L 74 64" />
      <path class="ink" d="M 48 42 L 92 42 L 86 28 L 54 28 Z" fill="rgba(150,108,60,0.25)"/>
      <path class="ink ink-thin" d="M 54 28 L 54 20 M 86 28 L 86 20 M 50 20 L 90 20" />
      <path class="ink" d="M 70 20 L 70 4 L 88 8 L 70 13" fill="rgba(168,98,47,0.4)"/>
    </svg>`,
    catapult: () => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <circle class="ink" cx="42" cy="108" r="11" fill="rgba(150,108,60,0.2)"/>
      <circle class="ink" cx="98" cy="108" r="11" fill="rgba(150,108,60,0.2)"/>
      <path class="ink ink-thin" d="M 42 108 l 6 -6 m -6 6 l -6 6 m 6 -6 l 6 6 m -6 -6 l -6 -6 M 98 108 l 6 -6 m -6 6 l -6 6 m 6 -6 l 6 6 m -6 -6 l -6 -6"/>
      <path class="ink" d="M 30 100 L 70 78 L 110 100" fill="none"/>
      <path class="ink" d="M 52 96 L 96 40" stroke-width="3.4" fill="none"/>
      <path class="ink" d="M 96 40 C 88 30, 104 22, 108 34 C 110 42, 102 46, 96 40 Z" fill="rgba(150,108,60,0.25)"/>
      ${SS.acornSVG(102, 30, 0.85)}
      <path class="ink ink-thin" d="M 56 92 C 62 98, 70 100, 78 98" opacity="0.6"/>
    </svg>`,
    den: () => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <path class="ink" d="M 22 118 L 70 44 L 118 118" fill="rgba(94,127,153,0.14)" stroke-width="3"/>
      <path class="ink" d="M 36 118 L 76 56 M 104 118 L 62 56" opacity="0.7"/>
      <path class="ink ink-thin" d="M 44 96 L 92 96 M 54 78 L 84 78" opacity="0.5"/>
      <path class="ink ink-thin" d="M 30 118 C 34 108, 30 100, 34 92 M 110 118 C 106 110, 110 100, 106 94" opacity="0.7"/>
      <path class="ink ink-thin" d="M 70 44 C 66 36, 72 30, 70 24 M 70 44 C 76 38, 74 30, 78 26" opacity="0.8"/>
    </svg>`,
    rack: () => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <path class="ink" d="M 30 118 L 30 44 M 110 118 L 110 44 M 22 48 L 118 48" fill="none"/>
      <path class="ink ink-thin" d="M 48 48 L 48 58 M 70 48 L 70 62 M 92 48 L 92 58"/>
      ${SS.fishSVG(48, 66, 1.05, 90)}${SS.fishSVG(70, 71, 1.15, 90)}${SS.fishSVG(92, 66, 1.0, 90)}
      <path class="ink ink-thin" d="M 26 118 l 8 -4 m 72 4 l 8 -4" opacity="0.5"/>
    </svg>`,
    fort: () => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <g fill="rgba(130,124,116,0.30)">
        <path class="ink" d="M 22 118 C 22 104, 46 104, 46 118 Z"/><path class="ink" d="M 48 118 C 48 102, 74 102, 74 118 Z"/><path class="ink" d="M 76 118 C 76 104, 100 104, 100 118 Z"/><path class="ink" d="M 102 118 C 102 106, 122 106, 122 118 Z"/>
        <path class="ink" d="M 34 102 C 34 88, 60 88, 60 102 Z"/><path class="ink" d="M 62 102 C 62 86, 88 86, 88 102 Z"/><path class="ink" d="M 90 102 C 90 90, 112 90, 112 102 Z"/>
        <path class="ink" d="M 48 86 C 48 72, 74 72, 74 86 Z"/><path class="ink" d="M 76 86 C 76 74, 98 74, 98 86 Z"/>
        <path class="ink" d="M 60 71 C 60 58, 84 58, 84 71 Z"/>
      </g>
      <path class="ink" d="M 72 58 L 72 40 L 88 44 L 72 49" fill="rgba(94,127,153,0.4)"/>
    </svg>`,
    splashtower: () => `<svg viewBox="0 0 140 140" style="overflow:visible">
      <path class="ink" d="M 46 118 L 62 54 M 94 118 L 78 54 M 70 118 L 70 60" fill="none"/>
      <path class="ink ink-thin" d="M 54 92 L 86 92 M 58 74 L 82 74"/>
      <path class="ink" d="M 52 54 L 88 54 L 84 30 L 56 30 Z" fill="rgba(94,127,153,0.22)"/>
      <path class="ink ink-thin" d="M 56 38 C 66 34, 74 34, 84 38" opacity="0.6"/>
      <path class="ink ink-thin" d="M 88 44 C 96 44, 100 50, 98 56" fill="none"/>
      <path class="ink ink-thin" d="M 98 58 c -1 3 1 5 2 7 m 2 -9 c 0 4 2 6 1 9" opacity="0.7"/>
    </svg>`
  };

  function placeStruct(key, xFrac, yOff, wPx, side) {
    const y = W.groundTop() + yOff;
    const sc = W.depthScale(y);
    const w = wPx * sc;
    const d = document.createElement('div');
    d.className = 'fx-abs';
    d.style.width = w + 'px'; d.style.height = w + 'px';
    d.style.left = (W.vw() * xFrac - w / 2) + 'px';
    d.style.top = (y - w * 0.845) + 'px';
    d.style.zIndex = String(10 + Math.round(y / 4) - 1);
    d.innerHTML = ART[key](w);
    d.style.transform = 'scale(0)';
    d.style.transformOrigin = '50% 85%';
    d.style.transition = 'transform .55s cubic-bezier(.3,1.5,.5,1)';
    document.getElementById('build-layer').appendChild(d);
    SS.tick(() => { d.style.transform = 'scale(1)'; });
    SS.fx.dust(W.vw() * xFrac, y, 4, [10, 24]);
    if (window.__sfx) window.__sfx.woodKnock(260);
    SS.structs.push({ el: d, key, side, x: W.vw() * xFrac, y });
    return d;
  }

  /* ---------------- tribes ---------------- */
  function assembleTribes() {
    // adopt the playground crowd; top up to 6 per side
    SS.tribes = { west: [], east: [] };
    W.critters.forEach(c => {
      if (!c.alive) return;
      (c.species === 'sq' ? SS.tribes.west : SS.tribes.east).push(c);
    });
    while (SS.tribes.west.length < 6) {
      const c = W.addCritter({ species: 'sq', size: rand(92, 116) });
      const p = W.randGround(0.05, 0.4); c.place(p.x, p.y);
      SS.playground.wirePetting(c);
      SS.tribes.west.push(c);
    }
    while (SS.tribes.east.length < 6) {
      const c = W.addCritter({ species: 'sl', size: rand(104, 130) });
      const p = W.randGround(0.6, 0.93); c.place(p.x, p.y);
      SS.playground.wirePetting(c);
      SS.tribes.east.push(c);
    }
    // trim extras back into the wild (walk off-screen)
    ['west', 'east'].forEach(side => {
      const arr = SS.tribes[side];
      while (arr.length > 6) {
        const c = arr.pop();
        c.moveTo(side === 'west' ? -160 : W.vw() + 160, c.y, 130, () => W.removeCritter(c));
      }
    });
  }

  function sendHome(side) {
    SS.tribes[side].forEach((c, i) => {
      const p = side === 'west' ? W.randGround(0.05, 0.42) : W.randGround(0.60, 0.93);
      later(() => c.moveTo(p.x, p.y, c.species === 'sq' ? 130 : 80), i * 180);
    });
  }

  /* send n critters of a side to build at (xFrac, yOff); they hammer until told otherwise */
  function crewBuild(side, xFrac, yOff, n = 2) {
    const y = W.groundTop() + yOff;
    const free = SS.tribes[side].filter(c => c.alive && !c._crewed);
    for (let i = 0; i < Math.min(n, free.length); i++) {
      const c = free[i];
      c._crewed = true;
      const off = (i === 0 ? -1 : 1) * rand(50, 70) * W.depthScale(y);
      c.stopMove();
      c.moveTo(W.vw() * xFrac + off, y + rand(-4, 10), c.species === 'sq' ? 140 : 85, () => {
        if (!c.alive) return;
        c.face(off < 0 ? 'r' : 'l');
        c.showItem('tool');
        c.setAction('build');
      });
    }
  }
  function releaseCrews() {
    [...SS.tribes.west, ...SS.tribes.east].forEach(c => {
      if (c._crewed) {
        c._crewed = false;
        if (c.alive) { c.showItem(null); c.setAction('idle'); }
      }
    });
  }
  // ambient hammer sounds while anyone is building
  function hammerLoop() {
    rep(() => {
      const busy = [...SS.tribes.west, ...SS.tribes.east].filter(c => c.el.classList.contains('act-build'));
      if (busy.length && window.__sfx) {
        window.__sfx.hammer();
        const c = pick(busy);
        const r = c.el.getBoundingClientRect();
        SS.fx.dust(r.left + r.width * (c.dir === 'l' ? 0.2 : 0.8), r.top + r.height * 0.8, 1, [5, 10]);
      }
    }, 620);
  }

  /* ---------------- day clock ---------------- */
  let dayShown = 1, dayT = null;
  function glideDays(toDay, ms) {
    if (dayT) clearInterval(dayT);
    const from = dayShown, t0 = Date.now();
    dayT = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / ms);
      dayShown = Math.round(from + (toDay - from) * t);
      W.clock('Day ' + dayShown, 'of 60');
      if (t >= 1) { clearInterval(dayT); dayT = null; }
    }, 90);
    timers.push(dayT);
  }

  /* ---------------- the wall ---------------- */
  const wallEl = document.getElementById('great-wall');
  const wallWood = document.getElementById('wall-wood');
  const wallCracks = document.getElementById('wall-cracks');
  function buildWallPlanks() {
    let s = '';
    for (let r = 0; r < 8; r++) {
      const y = 400 - r * 50;
      for (let i = 0; i < 4; i++) {
        const x = 5 + i * 25 + (r % 2) * 5;
        s += `<path class="ink ink-thin" d="M ${x} ${y} L ${x + 1} ${y - 52} L ${x + 19} ${y - 53} L ${x + 20} ${y}" fill="rgba(150,118,80,0.28)"/>`;
        if ((r + i) % 3 === 0) s += `<circle class="ink-fill" cx="${x + 10}" cy="${y - rand(14, 38)}" r="1.6" opacity="0.4"/>`;
      }
    }
    s += `<path class="ink" d="M 3 6 C 36 0, 74 0, 105 6" fill="none"/>`;
    wallWood.innerHTML = s;
  }
  function setWall(hVh) {
    wallEl.style.height = hVh + 'vh';
    if (window.__sfx) window.__sfx.stoneSet();
  }
  B.crackWall = (lvl) => {
    let s = wallCracks.innerHTML;
    s += `<path class="ink" d="M ${26 + lvl * 20} 400 l ${rand(-8, 8)} -60 l ${rand(-14, 6)} -50 l ${rand(-6, 14)} -46" fill="none" stroke-width="2.8" opacity="0.85"/>`;
    wallCracks.innerHTML = s;
    W.shake();
    if (window.__sfx) window.__sfx.crackHit(lvl);
  };
  B.collapseWall = () => {
    if (window.__sfx) window.__sfx.wallCollapse();
    W.shake(); W.flash();
    const r = wallEl.getBoundingClientRect();
    // tumbling planks
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div');
      p.className = 'fx-abs';
      p.style.width = '20px'; p.style.height = '52px';
      p.innerHTML = `<svg viewBox="0 0 20 52"><path class="ink ink-thin" d="M 2 50 L 3 2 L 17 1 L 18 50 Z" fill="rgba(150,118,80,0.4)"/></svg>`;
      p.style.left = (r.left + rand(-10, 60)) + 'px';
      p.style.top = (r.top + rand(0, r.height * 0.7)) + 'px';
      p.style.zIndex = 38;
      document.getElementById('fx-layer').appendChild(p);
      const dx = rand(-90, 90), rot = rand(-240, 240);
      p.style.transition = `transform ${rand(0.5, 0.9)}s cubic-bezier(.3,0,.7,1), opacity .4s ease ${rand(0.6, 1)}s`;
      SS.tick(() => {
        p.style.transform = `translate(${dx}px, ${r.bottom - r.top + rand(-30, 10)}px) rotate(${rot}deg)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 1600);
    }
    SS.fx.dust(r.left + 30, r.bottom - 20, 9, [16, 40]);
    wallEl.style.transition = 'height .5s ease-in';
    wallEl.style.height = '0';
    wallWood.innerHTML = ''; wallCracks.innerHTML = '';
  };

  /* ---------------- the story ---------------- */
  const N = (t, done) => W.narrate(t, 'narrator', null, done);

  const BEATS = [
    // [target day, glide ms budget headroom, fn(next)]
    (next) => { // the blame
      glideDays(1, 1200);
      // two delegations meet at the tideline
      const sq = SS.tribes.west.slice(0, 3), sl = SS.tribes.east.slice(0, 3);
      const y = W.groundTop() + 120;
      sq.forEach((c, i) => { c._crewed = true; c.stopMove(); c.moveTo(W.tidelineX() - 70 - i * 55, y + i * 26, 140); });
      sl.forEach((c, i) => { c._crewed = true; c.stopMove(); c.moveTo(W.tidelineX() + 75 + i * 60, y + i * 26, 85); });
      N("One autumn morning, the squirrels' winter stash — three hundred acorns, counted twice — was simply gone.", () => {
        sq.forEach(c => { c.setFace('angry', 'frown'); c.face('r'); });
        sl.forEach(c => { c.face('l'); });
        later(() => sq[0] && sq[0].say('THIEVES!!', 2000), 300);
        later(() => sl[0] && sl[0].say("we don't even EAT acorns!", 2400), 1400);
        later(() => sq[1] && sq[1].say('likely story!!', 1900), 2900);
        later(() => sl[1] && sl[1].say('the TIDE took them!', 2200), 4100);
        later(() => { sl.forEach(c => c.setFace('angry', 'frown')); }, 4200);
        N('The squirrels blamed the slippery newcomers. The seals blamed the tide. Nobody blamed the forgetful squirrel who buries things and… forgets.', () => {
          releaseCrews(); sendHome('west'); sendHome('east');
          later(next, 900);
        });
      });
    },
    (next) => { // homes
      glideDays(12, 6000);
      crewBuild('west', 0.10, 46, 2);
      crewBuild('east', 0.90, 46, 2);
      later(() => placeStruct('hut', 0.10, 46, 190, 'west'), 3200);
      later(() => placeStruct('den', 0.90, 46, 200, 'east'), 4600);
      N('So they stopped sharing the shore — and started building. The squirrels wove a twig lodge under the old oak. The seals heaped a den of driftwood by the rocks.', () => {
        releaseCrews();
        later(next, 700);
      });
    },
    (next) => { // stores
      glideDays(26, 6000);
      crewBuild('west', 0.225, 150, 2);
      crewBuild('east', 0.775, 150, 2);
      later(() => placeStruct('silo', 0.225, 150, 175, 'west'), 3000);
      later(() => placeStruct('rack', 0.775, 150, 185, 'east'), 4400);
      N('Every acorn left was counted and sealed in a silo. Every fish was dried on a rack, high up, where no picnic could reach it.', () => {
        releaseCrews();
        later(next, 700);
      });
    },
    (next) => { // defenses
      glideDays(40, 7500);
      crewBuild('west', 0.335, 26, 2);
      crewBuild('east', 0.665, 26, 2);
      later(() => placeStruct('lookout', 0.335, 26, 185, 'west'), 2600);
      later(() => placeStruct('fort', 0.665, 26, 195, 'east'), 3800);
      later(() => { crewBuild('west', 0.425, 168, 1); crewBuild('east', 0.575, 168, 1); }, 4200);
      later(() => placeStruct('catapult', 0.425, 168, 165, 'west'), 6400);
      later(() => placeStruct('splashtower', 0.575, 168, 175, 'east'), 7300);
      N("Then came the less neighborly part. A lookout perch, to watch the shore. A pebble fort, to watch the meadow. An acorn catapult — 'just in case'. A splash tower — also 'just in case'.", () => {
        releaseCrews();
        later(next, 800);
      });
    },
    (next) => { // the wall
      glideDays(56, 8000);
      buildWallPlanks();
      crewBuild('west', 0.485, 190, 2);
      crewBuild('east', 0.545, 190, 2);
      later(() => setWall(11), 1400);
      later(() => setWall(20), 3200);
      later(() => setWall(29), 5000);
      later(() => setWall(38), 6800);
      N('And down the middle of the world, plank by plank, both sides raised the same Driftwood Wall — each certain it was keeping the other out. Tall enough that nobody had to see anybody, ever again.', () => {
        releaseCrews(); sendHome('west'); sendHome('east');
        later(next, 1200);
      });
    },
    (next) => { // quiet days, then the crack
      glideDays(60, 5000);
      W.setMood('dusk');
      N('For four whole days, the wall worked. Nobody argued. Nobody played, either. The meadow learned how loud silence can be.', () => later(next, 800));
    },
    (next) => { // the acorn over the wall
      const sq = SS.tribes.west.find(c => c.alive), sl = SS.tribes.east.find(c => c.alive);
      if (!sq || !sl) { next(); return; }
      sq.stopMove(); sl.stopMove();
      sq._crewed = sl._crewed = true;
      const wy = W.groundTop() + 180;
      sq.moveTo(W.tidelineX() - 110, wy, 130, () => {
        sq.face('r');
        sq.say('…just to see if it comes back', 2600);
      });
      sl.moveTo(W.tidelineX() + 130, wy + 8, 80, () => {
        sl.setAction('sleep');
      });
      N('On the fifth day, a young squirrel lobbed a single acorn over the wall. Just to see if it would come back.', () => {
        sq.oneShot('strike', 320);
        if (window.__sfx) window.__sfx.dashWhoosh(0.9);
        const start = sq.el.getBoundingClientRect();
        SS.fx.lob('acorn', start.left + start.width * 0.7, start.top + start.height * 0.4, sl.x, sl.y - sl.size * 0.55, {
          arc: 170, dur: 950, spin: true,
          onHit: (x, y) => {
            if (window.__sfx) window.__sfx.woodKnock(220);
            SS.fx.impactStar(x, y, 34);
            sl.setAction('idle');
            sl.flashFace('angry', 'frown', 5000);
            sl.oneShot('hurt', 320);
            sl.say('WHO. THREW. THAT.', 2600);
            later(next, 2200);
          }
        });
      });
    },
    (next) => { // the wall pays for it
      const sl = SS.tribes.east.filter(c => c.alive)[0];
      const wy = W.groundTop() + 190;
      if (sl) {
        sl.stopMove();
        sl.moveTo(W.tidelineX() + 70, wy, 120, () => {
          sl.face('l');
          sl.oneShot('strike', 340);
          B.crackWall(1);
          later(() => {
            sl.say('and STAY cracked!!', 2000);
          }, 500);
        });
      } else B.crackWall(1);
      N('The seals slammed the wall to make a point. The point made a crack.', () => later(next, 700));
    },
    (next) => { // catapult misfire
      N("Then someone's paw slipped on the catapult. Nobody ever admitted whose.", () => {
        if (window.__sfx) { window.__sfx.launch(); }
        const cat = SS.structs.find(s => s.key === 'catapult');
        const cx = cat ? cat.x : W.vw() * 0.42, cy = cat ? cat.y - 90 : W.groundTop() + 80;
        SS.fx.lob('pinecone', cx, cy, W.tidelineX() - 6, W.groundTop() + 150, {
          arc: 240, dur: 1000, spin: true,
          onHit: (x, y) => {
            B.crackWall(2); B.crackWall(3);
            SS.fx.impactStar(x, y, 60);
            W.hitstop(140);
            later(() => {
              B.collapseWall();
              later(next, 1400);
            }, 900);
          }
        });
      });
    },
    (next) => { // face off
      // everyone marches to the fallen wall
      const wy = W.groundTop() + 150;
      SS.tribes.west.forEach((c, i) => {
        c.stopMove(); c._crewed = true;
        c.moveTo(W.tidelineX() - 90 - (i % 3) * 70, wy + Math.floor(i / 3) * 60 - 40, 150, () => { c.face('r'); c.setFace('angry', 'frown'); });
      });
      SS.tribes.east.forEach((c, i) => {
        c.stopMove(); c._crewed = true;
        c.moveTo(W.tidelineX() + 95 + (i % 3) * 75, wy + Math.floor(i / 3) * 60 - 40, 90, () => { c.face('l'); c.setFace('angry', 'frown'); });
      });
      N('The wall was down. Both sides stared through the gap it left — and nobody remembered whose fault the first acorn was. Only that the OTHER side started it.', () => later(next, 900));
    },
    () => { // on to war
      W.clock(null);
      SS.battle.start();
    }
  ];

  function runBeat(i) {
    if (W.state !== 'build') return;
    if (i >= BEATS.length) return;
    BEATS[i](() => runBeat(i + 1));
  }

  B.start = () => {
    if (W.state !== 'playground') return;
    W.state = 'build';
    SS.playground.stop();
    W.stopSpeech();
    if (window.__sfx) window.__sfx.stopMusic();
    W._skipHandler = B.skip;

    W.curtainTransition({
      num: 'CHAPTER TWO', name: 'Build Season',
      sub: 'an acorn stash goes missing · everyone blames everyone',
      holdMs: 3400,
      onMid: () => {
        assembleTribes();
        W.clearFood();
        W.setMood('build');
        W.clock('Day 1', 'of 60');
        W.banner('Chapter II · Build Season', 'sixty days of not talking to each other');
        if (window.__sfx) window.__sfx.startMusic('build', { volume: 0.38 });
        hammerLoop();
      },
      onUp: () => runBeat(0)
    });
  };

  B.placeDefaults = () => {
    if (SS.structs.length) return;
    placeStruct('hut', 0.10, 46, 190, 'west'); placeStruct('den', 0.90, 46, 200, 'east');
    placeStruct('silo', 0.225, 150, 175, 'west'); placeStruct('rack', 0.775, 150, 185, 'east');
    placeStruct('lookout', 0.335, 26, 185, 'west'); placeStruct('fort', 0.665, 26, 195, 'east');
    placeStruct('catapult', 0.425, 168, 165, 'west'); placeStruct('splashtower', 0.575, 168, 175, 'east');
  };

  B.abort = () => {
    clearAll();
    if (dayT) { clearInterval(dayT); dayT = null; }
    releaseCrews();
  };

  B.skip = () => {
    if (W.state !== 'build') return;
    clearAll();
    W.stopSpeech();
    if (dayT) clearInterval(dayT);
    releaseCrews();
    // make sure the stage state is complete for the battle
    if (!SS.tribes.west.length) assembleTribes();
    B.placeDefaults();
    wallEl.style.height = '0';
    W.clock(null);
    SS.battle.start();
  };
})();
