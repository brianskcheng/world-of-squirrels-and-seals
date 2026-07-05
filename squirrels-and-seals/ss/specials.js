/* =====================================================================
   SPECIALS — the unlockable ult library.
   SS.specials.cast(id, u, ctx) — ctx is provided by battle.js:
   { units, enemiesOf, alliesOf, applyDamage, heal, later, addTemp,
     W, fx, rand, pick, P (params), over() }
   All damage numbers here are pre-multiplied by P.specialX.
   ===================================================================== */
window.SS = window.SS || {};
(function () {
  const S = {};
  SS.specials = S;

  /* throw modifiers for champion basic attacks */
  S.THROW_MODS = {
    acorn:    { kind: 'acorn' },
    pinecone: { kind: 'pinecone', cdMul: 1.6,  dmgMul: 1.35, splash: 84, arc: 200 },
    berry3:   { kind: 'berry',    cdMul: 1.15, dmgMul: 0.5,  count: 3 },
    drop:     { kind: 'drop' },
    snowball: { kind: 'snowball', cdMul: 1.45, dmgMul: 1.15, slow: true },
    fish:     { kind: 'fish',     cdMul: 1.3,  dmgMul: 1.4,  speed: 950 }
  };

  const DEFS = {};
  S.DEFS = DEFS;
  S.cast = (id, u, ctx) => { const d = DEFS[id]; if (d) d(u, ctx); };

  /* ---------------- squirrel specials ---------------- */
  DEFS.tempest = (u, ctx) => {
    const { W, fx, rand, pick, enemiesOf, applyDamage, later, P } = ctx;
    for (let i = 0; i < 14; i++) {
      later(() => {
        if (ctx.over()) return;
        const f = pick(enemiesOf(u));
        const tx = f ? f.c.x + rand(-40, 40) : rand(W.vw() * 0.3, W.vw() * 0.9);
        const ty = f ? f.c.y + rand(-14, 14) : rand(W.groundTop(), W.groundBot());
        fx.lob('acorn', rand(0, W.vw()), -40, tx, ty, {
          spin: true, dur: rand(420, 640), arc: 0,
          onHit: (hx, hy) => {
            fx.impactStar(hx, hy, 34);
            fx.dust(hx, hy, 2, [8, 16]);
            if (window.__sfx && Math.random() < 0.5) window.__sfx.woodKnock(240);
            enemiesOf(u).forEach(f2 => {
              if (Math.hypot(f2.c.x - hx, f2.c.y - hy) < 60 + f2.c.size * 0.25) applyDamage(u, f2, 15 * P.specialX);
            });
          }
        });
      }, i * 120);
    }
  };

  DEFS.tailnado = (u, ctx) => {
    const { fx, applyDamage, enemiesOf, later, P, W } = ctx;
    u.c.el.classList.add('act-spin');
    u.spinningUntil = performance.now() + 1300;
    if (window.__sfx) window.__sfx.dashWhoosh(0.7);
    [0, 420, 840].forEach((t, i) => later(() => {
      if (!u.alive || ctx.over()) { u.c.el.classList.remove('act-spin'); return; }
      const r = u.c.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.6;
      fx.impactStar(cx + (i - 1) * 26, cy, 46);
      fx.dust(cx, cy + 14, 4, [12, 26]);
      if (window.__sfx) window.__sfx.dashWhoosh(1.3);
      enemiesOf(u).forEach(f => {
        if (Math.hypot(f.c.x - u.c.x, f.c.y - u.c.y) < 185 * u.c.scale + f.c.size * 0.3) {
          applyDamage(u, f, 12 * P.specialX, { kb: 2.4 });
        }
      });
      W.shake();
    }, t));
    later(() => u.c.el.classList.remove('act-spin'), 1320);
  };

  DEFS.oakguard = (u, ctx) => {
    const { heal, alliesOf, fx, later, P } = ctx;
    const crew = alliesOf(u).concat([u]);
    if (window.__sfx) window.__sfx.healChime();
    crew.forEach((a, i) => later(() => {
      if (!a.alive) return;
      heal(u, a, Math.round(30 * P.specialX));
      a.guardUntil = performance.now() + 6500;
      fx.ring(a.c, true);
      a.c.flashFace('happy', 'smile', 1400);
    }, i * 130));
  };

  DEFS.stampede = (u, ctx) => {
    const { W, fx, rand, later, enemiesOf, applyDamage, P } = ctx;
    const dir = u.side === 'west' ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      later(() => {
        if (ctx.over()) return;
        const y = rand(W.groundTop() + 24, W.groundBot() - 8);
        const c = W.addCritter({ species: 'sq', size: rand(100, 124) });
        c.place(dir > 0 ? -80 : W.vw() + 80, y);
        c.face(dir > 0 ? 'r' : 'l');
        c.el.classList.add('act-dash');
        c.setFace('angry', 'open');
        const hit = new Set();
        const t0 = performance.now(), dur = 1900;
        const x0 = c.x, x1 = dir > 0 ? W.vw() + 100 : -100;
        let runDone = false;
        const finishRun = () => { if (runDone) return; runDone = true; W.removeCritter(c); };
        setTimeout(finishRun, dur + 600);   /* rAF can stall in hidden tabs */
        (function run(ts) {
          if (runDone) return;
          const t = Math.min(1, (performance.now() - t0) / dur);
          c.setPos(x0 + (x1 - x0) * t, y);
          if (Math.random() < 0.3) fx.dust(c.x - dir * 30, c.y, 1, [8, 16]);
          enemiesOf(u).forEach(f => {
            if (!hit.has(f) && Math.abs(f.c.x - c.x) < 62 && Math.abs(f.c.y - c.y) < 66) {
              hit.add(f);
              fx.impactStar(f.c.x, f.c.y - 30, 40);
              applyDamage(u, f, 14 * P.specialX, { kb: 2 });
            }
          });
          if (t < 1 && !ctx.over()) requestAnimationFrame(run);
          else finishRun();
        })();
        if (window.__sfx) window.__sfx.dashWhoosh(1.1);
      }, i * 330);
    }
  };

  DEFS.meganut = (u, ctx) => {
    const { W, fx, rand, later, enemiesOf, applyDamage, P } = ctx;
    const foes = enemiesOf(u);
    if (!foes.length) return;
    /* aim at the centroid, then bounce onward */
    let cx = 0, cy = 0;
    foes.forEach(f => { cx += f.c.x; cy += f.c.y; });
    cx /= foes.length; cy /= foes.length;
    const dir = u.side === 'west' ? 1 : -1;
    const boom = (hx, hy, n) => {
      fx.impactStar(hx, hy, 70 - n * 10);
      fx.dust(hx, hy, 6, [14, 30]);
      W.shake();
      if (window.__sfx) (window.__sfx.bigImpact || window.__sfx.thunk)();
      enemiesOf(u).forEach(f => {
        if (Math.hypot(f.c.x - hx, f.c.y - hy) < 115 + f.c.size * 0.3) applyDamage(u, f, 18 * P.specialX, { kb: 1.8 });
      });
    };
    const r = u.c.el.getBoundingClientRect();
    const hops = [
      [cx, cy],
      [cx + dir * 150, Math.min(W.groundBot(), cy + rand(-40, 40))],
      [cx + dir * 300, Math.min(W.groundBot(), Math.max(W.groundTop(), cy + rand(-50, 50)))]
    ];
    let px = r.left + r.width / 2, py = r.top + r.height * 0.3;
    const hop = (n) => {
      if (n >= hops.length || ctx.over()) return;
      const [tx, ty] = hops[n];
      fx.lob('acorn', px, py, tx, ty, {
        spin: true, size: 66 - n * 12, arc: 190 - n * 50, speed: 520,
        onHit: (hx, hy) => { boom(hx, hy, n); px = hx; py = hy; hop(n + 1); }
      });
    };
    hop(0);
  };

  /* ---------------- seal specials ---------------- */
  DEFS.wave = (u, ctx) => {
    const { W, fx, enemiesOf, applyDamage, P } = ctx;
    const fromEast = u.side === 'east';
    const h = W.groundBot() - W.groundTop() + 160;
    const wdiv = document.createElement('div');
    wdiv.className = 'fx-abs';
    wdiv.style.width = '30vw'; wdiv.style.height = h + 'px';
    wdiv.style.top = (W.groundTop() - 130) + 'px';
    wdiv.style.left = fromEast ? '100vw' : '-30vw';
    wdiv.style.zIndex = 39;
    const flip = fromEast ? '' : 'transform:scaleX(-1);';
    wdiv.innerHTML = `<svg viewBox="0 0 300 ${h}" preserveAspectRatio="none" style="width:100%;height:100%;${flip}">
      <path class="ink" d="M 300 ${h} L 300 60 C 240 20, 210 90, 160 50 C 120 20, 90 80, 40 60 C 20 52, 8 60, 0 80 L 0 ${h} Z" fill="rgba(94,127,153,0.42)"/>
      <path class="ink ink-thin" d="M 260 80 C 240 60, 220 66, 205 84 M 150 76 C 130 58, 110 66, 96 84 M 60 92 C 48 78, 32 80, 22 96" fill="none" opacity="0.7"/>
    </svg>`;
    document.getElementById('fx-layer').appendChild(wdiv);
    if (window.__sfx) { window.__sfx.waterSplash(); window.__sfx.boomRamp && window.__sfx.boomRamp(); }
    const durMs = 1500, t0 = performance.now();
    const hitDone = new Set();
    let waveDone = false;
    const dmg = 20 * P.specialX;
    const finishWave = () => {
      if (waveDone) return;
      waveDone = true;
      enemiesOf(u).forEach(f => { if (!hitDone.has(f)) { hitDone.add(f); applyDamage(u, f, dmg, { kb: 2.6, slow: true }); } });
      wdiv.style.transition = 'opacity .4s'; wdiv.style.opacity = '0';
      setTimeout(() => wdiv.remove(), 450);
    };
    setTimeout(finishWave, durMs + 800);
    (function sweep() {
      if (waveDone) return;
      const t = Math.min(1, (performance.now() - t0) / durMs);
      const frontX = fromEast ? W.vw() * (1.05 - 1.35 * t) : W.vw() * (-0.35 + 1.35 * t) - W.vw() * 0.3;
      wdiv.style.left = frontX + 'px';
      const bandL = frontX, bandR = frontX + W.vw() * 0.3;
      enemiesOf(u).forEach(f => {
        if (!hitDone.has(f) && f.c.x > bandL && f.c.x < bandR) {
          hitDone.add(f);
          fx.splash(f.c.x, f.c.y - 20, 9);
          applyDamage(u, f, dmg, { kb: 2.6, slow: true });
        }
      });
      if (t < 1 && !ctx.over()) requestAnimationFrame(sweep);
      else finishWave();
    })();
  };

  DEFS.quake = (u, ctx) => {
    const { fx, enemiesOf, applyDamage, later, P, W } = ctx;
    u.c.oneShot('jump', 740);
    later(() => {
      if (!u.alive || ctx.over()) return;
      const r = u.c.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.bottom - 10;
      W.shake(); W.hitstop(120);
      if (window.__sfx) { window.__sfx.giantStomp(); window.__sfx.rumble && window.__sfx.rumble(); }
      fx.impactStar(cx, cy - 20, 64);
      for (let i = 0; i < 3; i++) later(() => fx.dust(cx + (i - 1) * 70, cy, 4, [16, 34]), i * 90);
      enemiesOf(u).forEach(f => {
        const d = Math.hypot(f.c.x - u.c.x, f.c.y - u.c.y);
        if (d < 260 * u.c.scale + f.c.size * 0.3) {
          applyDamage(u, f, 16 * P.specialX, { kb: 1.7 });
          f.stunUntil = performance.now() + 1700;
          f.c.flashFace('dizzy', 'o', 1700);
        }
      });
    }, 480);
  };

  DEFS.song = (u, ctx) => {
    const { heal, alliesOf, later, rand, P, fx } = ctx;
    u.c.say('♪ ooooOOooo ♪', 2200);
    if (window.__sfx) window.__sfx.healChime();
    const crew = alliesOf(u).concat([u]);
    crew.forEach((a, i) => later(() => {
      if (!a.alive) return;
      heal(u, a, Math.round(40 * P.specialX));
      a.slowUntil = 0;
      fx.ring(a.c, true);
      const r = a.c.el.getBoundingClientRect();
      const note = document.createElement('div');
      note.className = 'fx-abs zzz-fx';
      note.textContent = '♪';
      note.style.left = (r.left + r.width * rand(0.3, 0.7)) + 'px';
      note.style.top = (r.top - 6) + 'px';
      document.getElementById('fx-layer').appendChild(note);
      setTimeout(() => note.remove(), 2250);
    }, i * 160));
  };

  DEFS.pups = (u, ctx) => {
    const { W, rand, later, addTemp, fx } = ctx;
    const dir = u.side === 'west' ? 0.04 : 0.96;
    for (let i = 0; i < 3; i++) {
      later(() => {
        if (ctx.over()) return;
        const y = rand(W.groundTop() + 30, W.groundBot() - 10);
        const t = addTemp(u.side, {
          species: 'sl', size: rand(76, 88), variant: 'misty',
          x: W.vw() * dir, y,
          cls: { key: 'pup', name: 'Pup', hp: 70, dmg: 8, range: 66, speed: 150, cd: 0.7, melee: true },
          lifeMs: 20000
        });
        t.c.say(['arf!!', 'yip!', 'boop!!'][i], 1400);
        t.c.oneShot('jump', 740);
        const r = t.c.el.getBoundingClientRect();
        fx.splash(r.left + r.width / 2, r.bottom - 6, 5);
      }, i * 300);
    }
  };

  DEFS.iceberg = (u, ctx) => {
    const { W, fx, enemiesOf, applyDamage, later, P } = ctx;
    const foes = enemiesOf(u);
    if (!foes.length) return;
    let cx = 0, cy = 0;
    foes.forEach(f => { cx += f.c.x; cy += f.c.y; });
    cx /= foes.length; cy /= foes.length;
    const berg = document.createElement('div');
    berg.className = 'fx-abs';
    berg.style.width = '150px'; berg.style.height = '150px';
    berg.style.left = (cx - 75) + 'px'; berg.style.top = '-170px';
    berg.style.zIndex = 39;
    berg.innerHTML = `<svg viewBox="0 0 100 100" style="overflow:visible">
      <path class="ink" d="M 14 82 L 26 30 L 44 44 L 56 12 L 74 46 L 88 82 Z" fill="rgba(224,240,248,0.92)"/>
      <path class="ink ink-thin" d="M 44 44 L 40 82 M 56 12 L 60 46 L 58 82" opacity="0.5"/>
    </svg>`;
    berg.style.transition = 'top .8s cubic-bezier(.5,0,.9,.6)';
    document.getElementById('fx-layer').appendChild(berg);
    SS.tick(() => { berg.style.top = (cy - 130) + 'px'; });
    if (window.__sfx) window.__sfx.fallWhistle && window.__sfx.fallWhistle();
    later(() => {
      if (ctx.over()) { berg.remove(); return; }
      W.shake(); W.hitstop(140); W.flash();
      if (window.__sfx) { (window.__sfx.kaboom || window.__sfx.thunk)(); window.__sfx.waterSplash(); }
      fx.impactStar(cx, cy - 20, 78);
      fx.splash(cx, cy, 12);
      enemiesOf(u).forEach(f => {
        if (Math.hypot(f.c.x - cx, f.c.y - cy) < 165 + f.c.size * 0.3) {
          applyDamage(u, f, 14 * P.specialX, { kb: 1.4, slow: true });
          f.slowUntil = performance.now() + 4200;
          f.stunUntil = performance.now() + 900;
          f.c.flashFace('ouch', 'o', 1600);
        }
      });
      berg.style.transition = 'opacity .7s ease .3s, transform .8s ease';
      berg.style.transform = 'translateY(14px) rotate(4deg)';
      berg.style.opacity = '0';
      setTimeout(() => berg.remove(), 1300);
    }, 830);
  };
})();
