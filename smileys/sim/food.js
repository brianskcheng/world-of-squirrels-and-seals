/* =====================================================================
   FOOD — playground snacks & battle-field replenishment
   window.SIM.food
   ===================================================================== */
window.SIM = window.SIM || {};
(function () {
  const F = {};
  SIM.food = F;

  const KINDS = ['cookie', 'candy'];
  const SVG = {
    cookie: `<svg viewBox="-14 -14 28 28" style="overflow:visible;width:100%;height:100%">
      <circle cx="0" cy="0" r="11" fill="#e6c472" class="ink" stroke-width="2.2"/>
      <circle cx="-4" cy="-3" r="1.8" class="ink-fill"/>
      <circle cx="3" cy="-2" r="1.5" class="ink-fill"/>
      <circle cx="-2" cy="4" r="1.6" class="ink-fill"/>
      <circle cx="5" cy="3" r="1.4" class="ink-fill"/>
      <path class="ink ink-thin" d="M -9 12 L 9 12" opacity="0.25"/>
    </svg>`,
    candy: `<svg viewBox="-14 -14 28 28" style="overflow:visible;width:100%;height:100%">
      <ellipse cx="0" cy="0" rx="9" ry="7" fill="#f4a0b8" class="ink" stroke-width="2.2"/>
      <path class="ink ink-thin" d="M -9 0 L -14 -4 L -14 4 Z" fill="#fff6ee"/>
      <path class="ink ink-thin" d="M 9 0 L 14 -4 L 14 4 Z" fill="#fff6ee"/>
      <path class="ink ink-thin" d="M -9 12 L 9 12" opacity="0.25"/>
    </svg>`
  };

  let layer = null;
  let styleTag = null;
  let replenishTimer = null;
  let playgroundEatTimer = null;
  let battleSpawner = null;
  let battleSnacksRegistered = false;

  F.foods = [];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function saga() { return window.__saga || null; }

  function getParams() {
    try {
      if (window.SIM && SIM.meta && typeof SIM.meta.effective === 'function') {
        return SIM.meta.effective();
      }
    } catch (e) {}
    return {};
  }

  function snackEverySec() {
    const p = getParams();
    const v = p.snackEvery;
    return (typeof v === 'number' && v > 0) ? v : 12;
  }

  function snackHealFrac() {
    const p = getParams();
    const v = p.snackHeal;
    return (typeof v === 'number' && v >= 0) ? v : 0.18;
  }

  function groundLineY() {
    try {
      const s = saga();
      if (s && typeof s.groundY === 'function') return s.groundY();
    } catch (e) {}
    return window.innerHeight * 0.85;
  }

  function randGround(minX = 0.08, maxX = 0.92) {
    const W = window.innerWidth;
    const gy = groundLineY();
    return { x: rand(W * minX, W * maxX), y: gy };
  }

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    if (!styleTag || !styleTag.isConnected) {
      styleTag = document.createElement('style');
      styleTag.textContent = `
        #sim-food-layer {
          position: fixed; inset: 0; pointer-events: none;
          z-index: 105; overflow: hidden;
        }
        @keyframes sim-food-bob {
          0%, 100% { transform: translateY(0) rotate(var(--sim-rot, 0deg)) scale(var(--sim-scale, 1)); }
          50% { transform: translateY(-4px) rotate(var(--sim-rot, 0deg)) scale(var(--sim-scale, 1)); }
        }
        .sim-food-item {
          position: absolute; pointer-events: none;
          animation: sim-food-bob 2.8s ease-in-out infinite;
          will-change: transform;
        }
        .sim-food-crumb {
          position: fixed; pointer-events: none; z-index: 106;
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--ink, #5a1810); opacity: 0.85;
          transition: transform 0.45s ease-out, opacity 0.45s ease-out;
        }
        .sim-food-heal-pop {
          position: fixed; pointer-events: none; z-index: 160;
          font-family: inherit; font-weight: 700; font-size: 15px;
          color: #2a7a3a; text-shadow: 0 1px 0 rgba(255,255,255,0.6);
          transform: translate(-50%, 0); opacity: 0;
          transition: transform 0.85s ease-out, opacity 0.85s ease-out;
        }
        .sim-food-heal-pop.go { opacity: 1; transform: translate(-50%, -36px); }
      `;
      document.head.appendChild(styleTag);
    }
    layer = document.createElement('div');
    layer.id = 'sim-food-layer';
    document.body.appendChild(layer);
    return layer;
  }

  function playPop() {
    try {
      if (window.__sfx && typeof window.__sfx.pop === 'function') window.__sfx.pop();
    } catch (e) {}
  }

  function spawnCrumbs(x, y, n) {
    const count = n || 6;
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'sim-food-crumb';
      c.style.left = (x + rand(-8, 8)) + 'px';
      c.style.top = (y + rand(-6, 6)) + 'px';
      document.body.appendChild(c);
      requestAnimationFrame(() => {
        c.style.transform = `translate(${rand(-18, 18)}px, ${rand(-22, -6)}px) scale(0.2)`;
        c.style.opacity = '0';
      });
      setTimeout(() => c.remove(), 520);
    }
  }

  function showHealPop(x, y, txt) {
    try {
      const s = saga();
      if (s && typeof s.healPop === 'function') {
        s.healPop(x, y, txt);
        return;
      }
      if (s && typeof s.dmgPop === 'function') {
        s.dmgPop(x, y, txt, false, true);
        return;
      }
    } catch (e) {}
    const d = document.createElement('div');
    d.className = 'sim-food-heal-pop';
    d.textContent = txt;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    document.body.appendChild(d);
    requestAnimationFrame(() => d.classList.add('go'));
    setTimeout(() => d.remove(), 900);
  }

  function entityCenter(ent) {
    if (!ent) return null;
    try {
      if (ent.el && ent.el.getBoundingClientRect) {
        const r = ent.el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    } catch (e) {}
    const sz = ent.size || 50;
    const y = ent.baseY != null ? ent.baseY : ent.y;
    return { x: (ent.x || 0) + sz / 2, y: (y || 0) + sz / 2 };
  }

  F.spawnFood = function spawnFood(kind, x, y) {
    if (!KINDS.includes(kind)) kind = pick(KINDS);
    const L = ensureLayer();
    const sz = 26;
    const d = document.createElement('div');
    d.className = 'sim-food-item';
    d.style.width = sz + 'px';
    d.style.height = sz + 'px';
    d.style.left = (x - sz / 2) + 'px';
    d.style.top = (y - sz * 0.8) + 'px';
    d.style.setProperty('--sim-rot', rand(-14, 14).toFixed(1) + 'deg');
    d.style.setProperty('--sim-scale', '0');
    d.style.transition = 'transform 0.3s cubic-bezier(.3,1.6,.5,1)';
    d.innerHTML = SVG[kind] || SVG.cookie;
    L.appendChild(d);
    requestAnimationFrame(() => {
      d.style.setProperty('--sim-scale', '1');
      d.style.animationPlayState = 'running';
    });
    const f = { el: d, kind, x, y, taken: false, claimed: false };
    F.foods.push(f);
    return f;
  };

  F.takeFood = function takeFood(f) {
    if (!f || f.taken) return false;
    f.taken = true;
    f.claimed = true;
    try {
      f.el.style.animation = 'none';
      f.el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      f.el.style.setProperty('--sim-scale', '0');
      f.el.style.opacity = '0';
    } catch (e) {}
    playPop();
    setTimeout(() => { try { f.el.remove(); } catch (e2) {} }, 260);
    F.foods = F.foods.filter(x => x !== f);
    return true;
  };

  F.nearestFood = function nearestFood(kind, x, y, maxDist) {
    const cap = (typeof maxDist === 'number') ? maxDist : 1e9;
    let best = null;
    let bd = cap;
    F.foods.forEach(f => {
      if (f.taken || f.claimed) return;
      if (kind && f.kind !== kind) return;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f; }
    });
    return best;
  };

  F.clearFood = function clearFood() {
    F.foods.forEach(f => { try { f.el.remove(); } catch (e) {} });
    F.foods = [];
  };

  F.eatFood = function eatFood(entity, f, cb) {
    if (!f || f.taken) { if (cb) cb(); return; }
    f.claimed = true;
    spawnCrumbs(f.x, f.y, 7);
    F.takeFood(f);
    if (cb) {
      try { cb(); } catch (e) { console.error('[SIM.food eatFood]', e); }
    }
  };

  function playgroundAllowed() {
    try { return !document.body.classList.contains('saga-active'); } catch (e) { return true; }
  }

  function spawnPlaygroundBatch() {
    if (!playgroundAllowed()) return;
    const n = Math.random() < 0.45 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const p = randGround(0.06, 0.94);
      F.spawnFood(pick(KINDS), p.x, p.y);
    }
  }

  function tickPlaygroundEats() {
    if (!playgroundAllowed() || !F.foods.length) return;
    document.querySelectorAll('#stage .smiley, .playground-zone .smiley').forEach(el => {
      const r = el.getBoundingClientRect();
      const f = F.nearestFood(null, r.left + r.width / 2, r.top + r.height * 0.75, 34);
      if (f) F.takeFood(f);
    });
  }

  F.startReplenish = function startReplenish() {
    F.stopReplenish();
    replenishTimer = setInterval(spawnPlaygroundBatch, 7000);
    if (!playgroundEatTimer) playgroundEatTimer = setInterval(tickPlaygroundEats, 900);
  };

  F.stopReplenish = function stopReplenish() {
    if (replenishTimer != null) {
      clearInterval(replenishTimer);
      replenishTimer = null;
    }
    if (playgroundEatTimer != null) {
      clearInterval(playgroundEatTimer);
      playgroundEatTimer = null;
    }
  };

  function stopBattleSpawner() {
    if (battleSpawner != null) {
      clearInterval(battleSpawner);
      battleSpawner = null;
    }
  }

  function startBattleSpawner() {
    stopBattleSpawner();
    const ms = Math.max(1500, snackEverySec() * 1000);
    battleSpawner = setInterval(() => {
      try {
        const s = saga();
        if (!s || !s.combatRunning) return;
        if (F.foods.length >= 4) return;
        const p = randGround(0.08, 0.92);
        F.spawnFood(pick(KINDS), p.x, p.y);
      } catch (e) {}
    }, ms);
  }

  function healUnit(u) {
    if (!u || !u.alive || !u.maxHp) return;
    const amt = Math.round(u.maxHp * snackHealFrac());
    if (amt <= 0) return;
    u.hp = Math.min(u.maxHp, (u.hp || 0) + amt);
    try {
      const s = saga();
      if (s && typeof s.updateHp === 'function') s.updateHp(u);
    } catch (e) {}
    const c = entityCenter(u);
    if (c) showHealPop(c.x, c.y - 18, '+' + amt);
  }

  function tickBattleSnacks() {
    try {
      const s = saga();
      if (!s || !s.combatRunning) return;
      const units = []
        .concat(Array.isArray(s.leftTribe) ? s.leftTribe : [])
        .concat(Array.isArray(s.rightTribe) ? s.rightTribe : []);
      units.forEach(u => {
        if (!u || !u.alive) return;
        const c = entityCenter(u);
        if (!c) return;
        const f = F.nearestFood(null, c.x, c.y, 40);
        if (!f) return;
        F.takeFood(f);
        healUnit(u);
      });
    } catch (e) {}
  }

  F.enableBattleSnacks = function enableBattleSnacks() {
    if (battleSnacksRegistered) return;
    const s = saga();
    if (!s || !s.hooks) return;
    battleSnacksRegistered = true;

    if (Array.isArray(s.hooks.beforeCombat)) {
      s.hooks.beforeCombat.push(function () {
        startBattleSpawner();
      });
    }

    if (Array.isArray(s.hooks.onTick)) {
      s.hooks.onTick.push(tickBattleSnacks);
    }

    if (Array.isArray(s.hooks.afterCombat)) {
      s.hooks.afterCombat.push(function () {
        stopBattleSpawner();
        F.clearFood();
      });
    }
  };
})();
