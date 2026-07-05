/* =====================================================================
   BATTLE MODES — player-controlled layer for smileys saga combat
   Modes: story | quick | duel | auto
   Attaches SIM.battle to window.SIM
   ===================================================================== */
window.SIM = window.SIM || {};
(function () {
  const BT = {};
  SIM.battle = BT;

  const FACE_KEYS = ['happy', 'grin', 'wink', 'surprised', 'smug', 'laugh', 'cool', 'tongue', 'meh', 'sleepy', 'shy', 'angry'];
  const CHAMP_TITLES = { left: 'Champion of the West', right: 'Champion of the East' };
  const THROW_CLASS = {
    burst: 'gunner', sniper: 'sniper', rocket: 'rocketeer',
    orb: 'wizard', frost: 'frostmage', flame: 'pyromancer'
  };

  let active = false;
  let mode = 'story';
  let lastOpts = null;
  let PRM = null;
  let T = null;
  let players = [];
  let champs = { left: null, right: null };
  let playerMp = { left: 0, right: 0 };
  let prediction = null;
  let pickSides = {};
  let duelPickStep = 0;
  let battleT0 = 0;
  let storyPickDone = false;
  let standaloneReady = false;
  let domReady = false;
  let inputWired = false;
  let hookRefs = [];
  let permanentHookDone = false;
  let sagaHookRetry = null;
  let storyCombatAttached = false;
  let localTimers = [];

  const MP_MAX = 100;

  function saga() { return window.__saga || null; }
  function meta() { try { return (window.SIM && SIM.meta) || null; } catch (e) { return null; } }
  function outfits() { try { return (window.SIM && SIM.outfits) || null; } catch (e) { return null; } }
  function foodMod() { try { return (window.SIM && SIM.food) || null; } catch (e) { return null; } }
  function gameMod() { try { return (window.SIM && SIM.game) || null; } catch (e) { return null; } }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function later(fn, ms) {
    const S = saga();
    if (S && typeof S.later === 'function') return S.later(fn, ms);
    const t = setTimeout(fn, ms);
    localTimers.push(t);
    return t;
  }
  function clearLocalTimers() {
    localTimers.forEach(t => clearTimeout(t));
    localTimers = [];
  }

  function isCutscene() {
    try { return !!(window.__cutscene && window.__cutscene.active); } catch (e) { return false; }
  }

  function sideClasses(side) {
    const S = saga();
    if (!S) return [];
    return side === 'left' ? (S.WEST_CLASSES || []) : (S.EAST_CLASSES || []);
  }

  function enemiesOf(u) {
    const S = saga();
    if (!S || !u) return [];
    return (u.side === 'left' ? S.rightTribe : S.leftTribe).filter(o => o.alive);
  }

  function alliesOf(u) {
    const S = saga();
    if (!S || !u) return [];
    return (u.side === 'left' ? S.leftTribe : S.rightTribe).filter(o => o.alive && o !== u);
  }

  function dist(a, b) {
    const ay = a.baseY != null ? a.baseY : a.y;
    const by = b.baseY != null ? b.baseY : b.y;
    return Math.hypot(b.x - a.x, by - ay);
  }

  function contactPoint(u) {
    if (!u || !u.el) return { x: 0, y: 0 };
    const r = u.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
  }

  function ctrlOf(u) { return players.find(p => p.unit === u) || null; }
  function isPlayerChamp(u) { return u && u.isChamp && players.some(p => p.unit === u); }
  function p1() { return players[0] || null; }
  function playerSide() {
    if (mode === 'duel' || mode === 'auto') return pickSides.p1 || null;
    return p1() ? p1().side : null;
  }

  /* ---------------- DOM ---------------- */
  function injectStyles() {
    if (document.getElementById('sim-battle-styles')) return;
    const st = document.createElement('style');
    st.id = 'sim-battle-styles';
    st.textContent = `
      .pick-overlay{position:fixed;inset:0;z-index:270;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(58,38,26,.42);backdrop-filter:blur(2px)}
      .pick-overlay.on{display:flex}
      .pick-title{font-family:Caveat,cursive;font-size:clamp(30px,4.4vh,52px);font-weight:700;color:var(--paper,#f5ecd0);text-shadow:2px 2px 0 rgba(40,20,10,.5);transform:rotate(-1.4deg)}
      .pick-sub{font-family:Caveat,cursive;font-size:22px;color:var(--paper,#f5ecd0);opacity:.85;margin-bottom:26px}
      .pick-row{display:flex;gap:34px;align-items:stretch;max-height:72vh;flex-wrap:wrap;justify-content:center}
      .pick-card{width:min(305px,88vw);border:2.6px solid var(--ink,#3a2218);border-radius:20px;background:var(--paper,#f3ecd8);padding:18px;display:flex;flex-direction:column;text-align:center;overflow-y:auto}
      .pick-card .pc-art{width:132px;height:132px;margin:0 auto}
      .pick-card .pc-name{font-size:31px;font-weight:700;line-height:1}
      .pick-card .pc-desc{font-size:17px;opacity:.68;margin-top:5px;line-height:1.25}
      .pick-card .pc-stats{font-size:15px;opacity:.72;margin-top:8px;border-top:1.6px dashed rgba(74,50,38,.35);padding-top:6px;text-align:left;line-height:1.4}
      .pc-fight{margin-top:auto;font-family:Caveat,cursive;font-size:24px;font-weight:700;padding:8px 0 6px;background:var(--ink,#3a2218);color:var(--paper,#f3ecd8);border:2.2px solid var(--ink,#3a2218);border-radius:13px;cursor:pointer;box-shadow:2px 3px 0 rgba(74,50,38,.22)}
      .pc-fight:hover{transform:scale(1.03) rotate(-.6deg)}
      .pick-card.dim{opacity:.45;pointer-events:none;filter:saturate(.6)}
      .pick-mini-note{font-family:Caveat,cursive;font-size:17px;color:var(--paper,#f5ecd0);opacity:.8;margin-top:18px}
      .pick-mini-note button{font-family:Caveat,cursive;font-size:17px;background:transparent;border:1.8px dashed var(--paper,#f5ecd0);color:var(--paper,#f5ecd0);border-radius:10px;padding:3px 14px;cursor:pointer}
      #sim-player-hud{position:fixed;bottom:18px;left:22px;z-index:125;display:none;min-width:210px;border:2.4px solid var(--ink,#3a2218);border-radius:16px;background:rgba(243,236,216,.92);padding:10px 14px 12px;transform:rotate(-.6deg);font-family:Caveat,cursive}
      #sim-player-hud.on{display:block}
      #sim-player-hud.p2{left:auto;right:22px;transform:rotate(.8deg)}
      #sim-player-hud .ph-tag{font-size:13px;letter-spacing:2px;opacity:.5;margin-bottom:4px}
      #sim-player-hud .ph-row{display:flex;gap:10px;align-items:center}
      #sim-player-hud .ph-portrait{width:52px;height:52px;flex:none;border-radius:50%;overflow:hidden;border:2px solid var(--ink,#3a2218)}
      #sim-player-hud .ph-bars{flex:1;min-width:120px}
      #sim-player-hud .ph-name{font-size:22px;font-weight:700;line-height:1}
      #sim-player-hud .ph-bar{height:10px;border:1.8px solid var(--ink,#3a2218);border-radius:8px;background:rgba(255,253,244,.5);margin-top:4px;overflow:hidden}
      #sim-player-hud .ph-bar .fill{height:100%;width:100%;background:#6aab6a;transition:width .12s}
      #sim-player-hud .ph-bar.mp .fill{background:#7a9fd4}
      #sim-player-hud .ph-ready{font-size:14px;opacity:0;margin-top:5px;color:#8a5a12;font-weight:700}
      #sim-player-hud .ph-ready.on{opacity:1}
      #sim-post-overlay{position:fixed;inset:0;z-index:275;display:none;align-items:center;justify-content:center;background:rgba(58,38,26,.42);backdrop-filter:blur(2px)}
      #sim-post-overlay.on{display:flex}
      #sim-post-overlay .post-card{background:var(--paper,#f3ecd8);border:2.6px solid var(--ink,#3a2218);border-radius:22px;box-shadow:5px 7px 0 rgba(40,20,10,.3);padding:22px 34px 24px;text-align:center;transform:rotate(-.8deg);max-width:min(620px,92vw);font-family:Caveat,cursive}
      #sim-post-overlay .po-title{font-size:clamp(38px,8vw,58px);font-weight:700;line-height:1}
      #sim-post-overlay .po-sub{font-size:20px;opacity:.7;margin-top:4px}
      #sim-post-overlay .po-stats{display:flex;gap:26px;justify-content:center;margin:14px 0 4px;flex-wrap:wrap}
      #sim-post-overlay .po-stat b{display:block;font-size:32px;line-height:1}
      #sim-post-overlay .po-stat span{font-size:14.5px;opacity:.6;letter-spacing:1px}
      #sim-post-overlay .po-unlock{display:inline-block;border:2px solid #8a5a12;color:#8a5a12;border-radius:11px;padding:2px 12px;margin:3px 4px;font-size:17px;font-weight:700;transform:rotate(-1deg);background:rgba(232,179,58,.14)}
      #sim-post-overlay .po-btns{display:flex;gap:14px;justify-content:center;margin-top:16px;flex-wrap:wrap}
      #sim-post-overlay .choice-btn{font-family:Caveat,cursive;font-size:25px;font-weight:700;padding:12px 26px;background:var(--paper,#f3ecd8);border:2.4px solid var(--ink,#3a2218);color:var(--ink,#3a2218);border-radius:16px;cursor:pointer;box-shadow:3px 4px 0 rgba(74,50,38,.2)}
      #sim-post-overlay .choice-btn small{display:block;font-size:16px;font-weight:400;opacity:.65}
      #sim-ta-wrap{position:fixed;bottom:18px;right:22px;z-index:124;display:none;gap:10px}
      #sim-ta-wrap.on{display:flex}
      #sim-ta-wrap button{width:74px;height:74px;border-radius:50%;border:2.4px solid var(--ink,#3a2218);background:rgba(243,236,216,.92);font-family:Caveat,cursive;font-size:17px;font-weight:700;color:var(--ink,#3a2218);cursor:pointer;line-height:1;box-shadow:2px 3px 0 rgba(74,50,38,.18)}
      #sim-ta-wrap button.sp.ready{background:#e8b33a}
      #sim-duel-hint{position:fixed;bottom:118px;left:50%;transform:translateX(-50%) rotate(-.4deg);z-index:120;display:none;border:2px solid var(--ink,#3a2218);border-radius:14px;background:rgba(243,236,216,.92);padding:8px 16px;font-family:Caveat,cursive;font-size:16.5px;line-height:1.5;text-align:center;max-width:min(620px,92vw)}
      #sim-duel-hint.on{display:block}
      #sim-duel-hint b{display:inline-block;border:1.5px solid var(--ink,#3a2218);border-radius:6px;padding:0 6px;margin:0 1px;font-weight:600;background:rgba(255,255,255,.55);font-size:14px}
      .world-smiley.is-player{filter:drop-shadow(0 0 6px rgba(232,179,58,.75))}
      .world-smiley.champion .hpbar{display:block!important}
      .champ-label{position:absolute;left:50%;top:-22px;transform:translateX(-50%);font-family:Caveat,cursive;font-size:14px;font-weight:700;white-space:nowrap;color:var(--ink,#3a2218);text-shadow:0 1px 0 rgba(255,253,244,.8);pointer-events:none}
    `;
    document.head.appendChild(st);
  }

  function ensureDom() {
    if (domReady) return;
    domReady = true;
    injectStyles();

    if (!document.getElementById('sim-pick-overlay')) {
      const po = document.createElement('div');
      po.className = 'pick-overlay';
      po.id = 'sim-pick-overlay';
      po.innerHTML = `<div class="pick-title" id="sim-pick-title"></div><div class="pick-sub" id="sim-pick-sub"></div><div class="pick-row" id="sim-pick-row"></div>`;
      document.body.appendChild(po);
    }

    if (!document.getElementById('sim-player-hud')) {
      const hud = document.createElement('div');
      hud.id = 'sim-player-hud';
      hud.innerHTML = `<div class="ph-tag" id="sim-ph-tag">YOUR CHAMPION</div>
        <div class="ph-row"><div class="ph-portrait" id="sim-ph-portrait"></div>
        <div class="ph-bars"><div class="ph-name" id="sim-ph-name"></div>
        <div class="ph-bar hp"><div class="fill" id="sim-ph-hp"></div></div>
        <div class="ph-bar mp"><div class="fill" id="sim-ph-mp"></div></div>
        <div class="ph-ready" id="sim-ph-ready">special ready — press K</div></div></div>`;
      document.body.appendChild(hud);

      const hud2 = hud.cloneNode(true);
      hud2.id = 'sim-player-hud-2';
      hud2.classList.add('p2');
      hud2.querySelector('#sim-ph-tag').id = 'sim-ph-tag-2';
      hud2.querySelector('#sim-ph-portrait').id = 'sim-ph-portrait-2';
      hud2.querySelector('#sim-ph-name').id = 'sim-ph-name-2';
      hud2.querySelector('#sim-ph-hp').id = 'sim-ph-hp-2';
      hud2.querySelector('#sim-ph-mp').id = 'sim-ph-mp-2';
      hud2.querySelector('#sim-ph-ready').id = 'sim-ph-ready-2';
      document.body.appendChild(hud2);
    }

    if (!document.getElementById('sim-post-overlay')) {
      const post = document.createElement('div');
      post.id = 'sim-post-overlay';
      post.innerHTML = `<div class="post-card"><div class="po-title" id="sim-po-title"></div><div class="po-sub" id="sim-po-sub"></div>
        <div class="po-stats" id="sim-po-stats"></div><div class="po-unlocks" id="sim-po-unlocks"></div><div class="po-btns" id="sim-po-btns"></div></div>`;
      document.body.appendChild(post);
    }

    if (!document.getElementById('sim-ta-wrap')) {
      const ta = document.createElement('div');
      ta.id = 'sim-ta-wrap';
      ta.innerHTML = `<button id="sim-ta-atk">BONK</button><button id="sim-ta-sp" class="sp">SPECIAL</button><button id="sim-ta-dash">DASH</button>`;
      document.body.appendChild(ta);
      document.getElementById('sim-ta-atk').addEventListener('click', () => { if (p1()) playerAttack(p1()); });
      document.getElementById('sim-ta-sp').addEventListener('click', () => { if (p1()) playerSpecial(p1()); });
      document.getElementById('sim-ta-dash').addEventListener('click', () => { if (p1()) playerDash(p1()); });
    }

    if (!document.getElementById('sim-duel-hint')) {
      const dh = document.createElement('div');
      dh.id = 'sim-duel-hint';
      dh.innerHTML = `<span><b>P1</b> <b>WASD</b> move · <b>F</b> bonk · <b>G</b> special · <b>H</b> dash</span>
        &nbsp;·&nbsp; <span><b>P2</b> <b>←↑↓→</b> move · <b>J</b> bonk · <b>K</b> special · <b>L</b> dash</span>`;
      document.body.appendChild(dh);
    }

    if (!document.getElementById('sim-controls-hint')) {
      const ch = document.createElement('div');
      ch.id = 'sim-controls-hint';
      ch.className = 'controls-hint';
      ch.innerHTML = `<div class="ch-row"><b>WASD</b>/<b>←↑↓→</b> move</div>
        <div class="ch-row"><b>J</b>/<b>space</b> attack &nbsp; <b>L</b> dash</div>
        <div class="ch-row"><b>K</b> special &nbsp;·&nbsp; or click to move / tap a foe</div>`;
      document.body.appendChild(ch);
    }
  }

  function battleHintId() {
    if (mode === 'duel') return 'sim-duel-hint';
    if (mode === 'auto') return null;
    return 'sim-controls-hint';
  }

  function showHud(on) {
    const hintId = battleHintId();
    const ids = ['sim-player-hud', 'sim-player-hud-2', 'sim-ta-wrap'];
    if (hintId) ids.push(hintId);
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (on && (id === 'sim-ta-wrap' ? window.matchMedia('(pointer: coarse)').matches && mode !== 'duel' && mode !== 'auto' : true)) {
        el.classList.add('on');
      } else {
        el.classList.remove('on');
      }
    });
    const teamHud = document.getElementById('team-hud');
    if (teamHud && on) teamHud.style.display = 'flex';
  }

  function hideHud() {
    ['sim-player-hud', 'sim-player-hud-2', 'sim-ta-wrap', 'sim-duel-hint', 'sim-controls-hint'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('on');
    });
  }

  /* ---------------- champions & field ---------------- */
  function tuneChampion(u, side, human) {
    const M = meta();
    if (!M || !u) return;
    let hp = 430 * M.upMul(side, 'upHp') * (PRM.hpMult || 1);
    let dmg = 20 * M.upMul(side, 'upDmg') * (PRM.dmgMult || 1);
    let spd = 220 * M.upMul(side, 'upSpd');
    if (human) { hp *= PRM.pHp || 1; dmg *= PRM.pDmg || 1; spd *= PRM.pSpd || 1; }
    else { hp *= PRM.eHp || 1; dmg *= PRM.eDmg || 1; }
    if (mode === 'duel') hp *= PRM.duelHp || 1;
    u.maxHp = Math.round(hp);
    u.hp = u.maxHp;
    u.dmg = dmg;
    u.champSpeed = spd;
    u.meleeRange = side === 'left' ? 92 : 100;
    u.rangedRange = 350;
    u.champCd = (PRM.pCd || 1) * 0.45;
    if (typeof saga().updateHp === 'function') saga().updateHp(u);
  }

  function addNameLabel(u, name) {
    if (!u || !u.el) return;
    const old = u.el.querySelector('.champ-label');
    if (old) old.remove();
    const d = document.createElement('div');
    d.className = 'champ-label';
    d.textContent = name;
    u.el.appendChild(d);
  }

  function makeChampion(side, human) {
    const S = saga();
    const M = meta();
    const O = outfits();
    if (!S || !M) return null;
    const cust = M.custom(side);
    const gy = S.groundY();
    const W = window.innerWidth;
    const x = side === 'left' ? W * (mode === 'duel' ? 0.3 : 0.38) : W * (mode === 'duel' ? 0.7 : 0.62);
    const y = gy - cust.size;
    const el = S.makeWorldSmiley(cust.face, side, { x, y, size: cust.size });
    el.classList.add('champion', 'warrior');
    el.style.setProperty('--ink', (S.TRIBE_COLORS && S.TRIBE_COLORS[side]) || '#3a2218');
    const meleeCls = (sideClasses(side).find(c => c.key === 'samurai') || sideClasses(side)[0]);
    const u = {
      el, faceKey: cust.face, side, alive: true, x, y, baseY: y, size: cust.size,
      cooldown: 0, champCd: 0, isChamp: true, isPlayer: !!human,
      playerControlled: !!human, specialId: cust.special, throwId: cust.throw,
      champName: cust.name, role: 'frontline'
    };
    if (O && typeof O.apply === 'function') O.apply(u, M.outfitOf(side));
    if (O && typeof O.setFaceOn === 'function') O.setFaceOn(u, cust.face);
    S.assignClass(u, meleeCls);
    el.querySelector('.hpbar').style.display = 'block';
    S.makeWarriorLook(u);
    tuneChampion(u, side, human);
    addNameLabel(u, cust.name);
    u.el.classList.toggle('flip-x', side === 'left');
    (side === 'left' ? S.leftTribe : S.rightTribe).push(u);
    champs[side] = u;
    return u;
  }

  function spawnWarrior(side, idx, total) {
    const S = saga();
    if (!S) return null;
    const classes = sideClasses(side);
    const fk = pick(FACE_KEYS);
    const W = window.innerWidth;
    const gy = S.groundY();
    const sz = rand(48, 58);
    const x = side === 'left' ? rand(W * 0.08, W * 0.34) : rand(W * 0.66, W * 0.92);
    const y = gy - sz - (idx / Math.max(1, total)) * (window.innerHeight * 0.32);
    const el = S.makeWorldSmiley(fk, side, { x, y, size: sz });
    el.classList.add('builder');
    el.style.setProperty('--ink', (S.TRIBE_COLORS && S.TRIBE_COLORS[side]) || '#3a2218');
    return {
      el, faceKey: fk, side, alive: true, x, y, baseY: y, size: sz,
      plannedClass: classes[idx % classes.length], cooldown: 0, vx: 0, vy: 0
    };
  }

  function clearBattlefield() {
    const S = saga();
    if (!S) return;
    document.querySelectorAll('#fx-layer .world-smiley').forEach(el => el.remove());
    S.leftTribe.splice(0, S.leftTribe.length);
    S.rightTribe.splice(0, S.rightTribe.length);
    champs = { left: null, right: null };
  }

  function prepArena() {
    const S = saga();
    if (!S) return;
    try { if (window.__pg && window.__pg.clearYard) window.__pg.clearYard(); } catch (e) {}
    document.body.classList.add('saga-active');
    const sagaEl = document.getElementById('saga');
    if (sagaEl) sagaEl.classList.add('on', 'armageddon', 'atmo-war');
    S.setState('ch3');
    clearBattlefield();
    const n = Math.max(2, Math.round(PRM.units || 6));
    if (mode !== 'duel') {
      for (let i = 0; i < n; i++) S.leftTribe.push(spawnWarrior('left', i, n));
      for (let i = 0; i < n; i++) S.rightTribe.push(spawnWarrior('right', i, n));
      if (typeof S.armWarriorsForBattle === 'function') S.armWarriorsForBattle();
    }
    makeChampion('left', mode === 'duel');
    makeChampion('right', mode === 'duel');
    const teamHud = document.getElementById('team-hud');
    if (teamHud) teamHud.style.display = 'flex';
    if (typeof S.updateTeamHud === 'function') S.updateTeamHud();
    standaloneReady = true;
  }

  /* ---------------- pick overlay ---------------- */
  function pickCard(side) {
    const M = meta();
    const O = outfits();
    const card = document.createElement('div');
    card.className = 'pick-card';
    card.dataset.side = side;
    const cust = M ? M.custom(side) : { name: side, face: 'happy', size: 120 };
    const spDef = M ? M.specialDef(side, cust.special) : { name: 'Special' };
    const thDef = M ? M.throwDef(side, cust.throw) : { name: 'Throw' };
    let btn = 'Fight as ' + cust.name;
    if (mode === 'duel') btn = (duelPickStep === 0 ? 'Player 1: ' : 'Player 2: ') + 'take ' + cust.name;
    if (mode === 'auto') btn = 'cheer for the ' + (side === 'left' ? 'west' : 'east');
    const art = (O && typeof O.portrait === 'function') ? O.portrait(side, cust) : '';
    card.innerHTML = `<div class="pc-art">${art}</div><div class="pc-name">${cust.name}</div>
      <div class="pc-desc">${CHAMP_TITLES[side]} · ${side === 'left' ? 'modern steel' : 'ancient arts'}</div>
      <div class="pc-stats"><b>Special (K):</b> ${spDef.name}<br><b>Throw:</b> ${thDef.name}</div>
      <button type="button" class="pc-fight">${btn}</button>`;
    card.querySelector('.pc-fight').addEventListener('click', () => onPickSide(side));
    return card;
  }

  function refreshPick() {
    const row = document.getElementById('sim-pick-row');
    if (!row) return;
    row.innerHTML = '';
    ['left', 'right'].forEach(side => {
      const card = pickCard(side);
      if (mode === 'duel' && duelPickStep === 1 && pickSides.p1 === side) card.classList.add('dim');
      row.appendChild(card);
    });
    let note = document.getElementById('sim-pick-note');
    const overlay = document.getElementById('sim-pick-overlay');
    if (mode === 'auto') {
      if (!note) {
        note = document.createElement('div');
        note.className = 'pick-mini-note';
        note.id = 'sim-pick-note';
        overlay.appendChild(note);
      }
      note.innerHTML = `or <button type="button" id="sim-pick-nobet">just watch — no bets</button>`;
      const nb = document.getElementById('sim-pick-nobet');
      if (nb) nb.onclick = () => { prediction = null; closePick(); launchStandaloneBattle(null); };
    } else if (mode === 'story') {
      if (!note) {
        note = document.createElement('div');
        note.className = 'pick-mini-note';
        note.id = 'sim-pick-note';
        overlay.appendChild(note);
      }
      note.innerHTML = `<button type="button" id="sim-pick-watch">just watch — no champion</button>`;
      const wb = document.getElementById('sim-pick-watch');
      if (wb) wb.onclick = () => onStoryWatchOnly();
    } else if (note) note.remove();
  }

  function onStoryWatchOnly() {
    closePick();
    storyPickDone = true;
    players = [];
    playerMp = { left: 0, right: 0 };
    T = null;
    hideHud();
    const S = saga();
    if (S) S.combatPaused = false;
  }

  function showPick() {
    ensureDom();
    duelPickStep = 0;
    pickSides = {};
    const title = document.getElementById('sim-pick-title');
    const sub = document.getElementById('sim-pick-sub');
    if (mode === 'duel') {
      if (title) title.textContent = 'Player 1 — choose your champion';
      if (sub) sub.textContent = 'player 2 gets the other one';
    } else if (mode === 'auto') {
      if (title) title.textContent = 'The armies take the field';
      if (sub) sub.textContent = 'back a side — a correct call completes a challenge';
    } else {
      if (title) title.textContent = 'Choose your champion';
      if (sub) sub.textContent = 'this fight is yours to win — pick a side';
    }
    refreshPick();
    document.getElementById('sim-pick-overlay').classList.add('on');
  }

  function closePick() {
    const el = document.getElementById('sim-pick-overlay');
    if (el) el.classList.remove('on');
  }

  function onPickSide(side) {
    if (mode === 'auto') {
      prediction = side;
      closePick();
      launchStandaloneBattle(null);
      return;
    }
    if (mode === 'duel') {
      if (duelPickStep === 0) {
        pickSides.p1 = side;
        pickSides.p2 = side === 'left' ? 'right' : 'left';
        duelPickStep = 1;
        document.getElementById('sim-pick-title').textContent = 'Player 2 — your champion';
        document.getElementById('sim-pick-sub').textContent = 'hit ready when set';
        refreshPick();
        const other = pickSides.p2;
        const btn = document.querySelector(`.pick-card[data-side="${other}"] .pc-fight`);
        if (btn) btn.textContent = 'Player 2 ready — FIGHT!';
        return;
      }
      closePick();
      launchStandaloneBattle(pickSides.p1);
      return;
    }
    closePick();
    if (mode === 'story') {
      storyPickDone = true;
      beginPlayerBattle(side);
      const S = saga();
      if (S) S.combatPaused = false;
    } else {
      pickSides.p1 = side;
      launchStandaloneBattle(side);
    }
  }

  /* ---------------- player setup ---------------- */
  function makeController(side, hudIdx) {
    return { side, unit: champs[side], keys: {}, dashUntil: 0, dashCd: 0, moveOrder: null, chaseOrder: null, hud: hudIdx, mp: 0 };
  }

  function setPlayerUnit(ctrl, u, silent) {
    if (!ctrl || !u) return;
    if (ctrl.unit && ctrl.unit.el) ctrl.unit.el.classList.remove('is-player');
    ctrl.unit = u;
    u.playerControlled = true;
    u.isPlayer = true;
    if (u.el) u.el.classList.add('is-player');
    const sfx = ctrl.hud === 2 ? '-2' : '';
    const M = meta();
    const O = outfits();
    const port = document.getElementById('sim-ph-portrait' + sfx);
    const nameEl = document.getElementById('sim-ph-name' + sfx);
    if (port && O && typeof O.portrait === 'function' && M) {
      port.innerHTML = O.portrait(u.side, M.custom(u.side));
    }
    if (nameEl) nameEl.textContent = u.champName || u.side;
    updatePlayerHud();
    if (!silent) {
      const S = saga();
      if (S && typeof S.spawnCastRing === 'function') {
        const c = contactPoint(u);
        S.spawnCastRing(c.x, c.y, u.side);
      }
    }
  }

  function beginPlayerBattle(side) {
    const S = saga();
    const M = meta();
    if (!S || !M) return;
    players = [];
    playerMp = { left: 0, right: 0 };
    const humanSide = side || pickSides.p1 || 'left';
    if (mode === 'story' && !champs.left && !champs.right) {
      makeChampion('left', humanSide === 'left');
      makeChampion('right', humanSide === 'right');
    }
    if (champs.left) tuneChampion(champs.left, 'left', mode === 'duel' || humanSide === 'left');
    if (champs.right) tuneChampion(champs.right, 'right', mode === 'duel' || humanSide === 'right');
    if (mode === 'duel') {
      document.body.classList.add('duel-on');
      players.push(makeController(pickSides.p1 || 'left', 1));
      players.push(makeController(pickSides.p2 || 'right', 2));
      document.getElementById('sim-duel-hint').classList.add('on');
      document.getElementById('sim-player-hud').classList.add('on');
      document.getElementById('sim-player-hud-2').classList.add('on');
    } else if (mode === 'auto') {
      showHud(false);
    } else {
      players.push(makeController(side || pickSides.p1 || 'left', 1));
      showHud(true);
    }
    players.forEach(p => { if (p.unit) setPlayerUnit(p, p.unit, true); });
    wireInput();
    const ps = playerSide();
    T = M.beginBattle({ mode, side: ps, difficulty: M.difficulty() });
    if (T) {
      T.onUnlock = (ch) => {
        if (typeof S.warBanner === 'function') S.warBanner('CHALLENGE COMPLETE', ch.name, 2800);
        try { if (window.__sfx && window.__sfx.healChime) window.__sfx.healChime(); } catch (e) {}
      };
    }
    battleT0 = performance.now();
    const F = foodMod();
    if (F && typeof F.enableBattleSnacks === 'function') F.enableBattleSnacks();
    try { if (window.__sfx) window.__sfx.startMusic('battle', { volume: 0.4 }); } catch (e) {}
    updatePlayerHud();
  }

  function launchStandaloneBattle(side) {
    if (!standaloneReady) prepArena();
    beginPlayerBattle(side);
    const S = saga();
    if (!S) return;
    const msgs = mode === 'auto' ? ['THE ARMIES MEET', 'GO!!!'] : ['READY', '3', '2', '1', 'GO!!!'];
    msgs.forEach((m, i) => later(() => {
      if (typeof S.warBanner === 'function') {
        S.warBanner(m, i === msgs.length - 1 ? (mode === 'auto' ? (prediction ? 'you backed the ' + (prediction === 'left' ? 'west' : 'east') : 'no bets placed') : 'bonk them all!') : '', i === msgs.length - 1 ? 1600 : 850);
      }
      try { if (window.__sfx && window.__sfx.taiko) window.__sfx.taiko(0.55 + i * 0.1); } catch (e) {}
    }, 400 + i * 750));
    later(() => {
      if (typeof S.runCombat === 'function' && !S.combatRunning) S.runCombat();
    }, 400 + msgs.length * 750 + 400);
  }

  /* ---------------- input ---------------- */
  const KEYS_1P = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
  const KEYS_D1 = { w: 'up', s: 'down', a: 'left', d: 'right' };
  const KEYS_D2 = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };

  function inputBlocked() {
    if (!active) return true;
    const S = saga();
    if (isCutscene()) return true;
    if (S && S.combatPaused && mode === 'story' && !storyPickDone) return true;
    if (S && !S.combatRunning) return true;
    return false;
  }

  function onKeyDown(e) {
    if (inputBlocked()) return;
    const k = e.key.toLowerCase();
    if (mode === 'duel') {
      const c1 = players[0], c2 = players[1];
      if (!c1 || !c2) return;
      if (KEYS_D1[k]) { c1.keys[KEYS_D1[k]] = true; e.preventDefault(); }
      else if (k === 'f') { playerAttack(c1); e.preventDefault(); }
      else if (k === 'g') { playerSpecial(c1); e.preventDefault(); }
      else if (k === 'h') { playerDash(c1); e.preventDefault(); }
      else if (KEYS_D2[k]) { c2.keys[KEYS_D2[k]] = true; e.preventDefault(); }
      else if (k === 'j') { playerAttack(c2); e.preventDefault(); }
      else if (k === 'k') { playerSpecial(c2); e.preventDefault(); }
      else if (k === 'l') { playerDash(c2); e.preventDefault(); }
      return;
    }
    const ctrl = p1();
    if (!ctrl) return;
    if (KEYS_1P[k]) { ctrl.keys[KEYS_1P[k]] = true; ctrl.moveOrder = ctrl.chaseOrder = null; e.preventDefault(); }
    else if (k === 'j' || k === ' ') { playerAttack(ctrl); e.preventDefault(); }
    else if (k === 'k') { playerSpecial(ctrl); e.preventDefault(); }
    else if (k === 'l' || k === 'shift') { playerDash(ctrl); e.preventDefault(); }
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (mode === 'duel') {
      if (players[0] && KEYS_D1[k]) players[0].keys[KEYS_D1[k]] = false;
      if (players[1] && KEYS_D2[k]) players[1].keys[KEYS_D2[k]] = false;
      return;
    }
    if (p1() && KEYS_1P[k]) p1().keys[KEYS_1P[k]] = false;
  }

  function onPointer(e) {
    if (inputBlocked() || mode === 'duel' || mode === 'auto') return;
    const ctrl = p1();
    if (!ctrl || !ctrl.unit || !ctrl.unit.alive) return;
    if (e.target.closest && e.target.closest('#sim-player-hud,#sim-player-hud-2,#sim-ta-wrap,#sim-pick-overlay,#sim-post-overlay,#team-hud,button')) return;
    const S = saga();
    const t = e.target.closest ? e.target.closest('.world-smiley') : null;
    if (t) {
      const tribe = [...(S ? S.leftTribe : []), ...(S ? S.rightTribe : [])];
      const ent = tribe.find(u => u.el === t);
      if (ent && ent.side !== ctrl.side && ent.alive) {
        ctrl.chaseOrder = ent;
        ctrl.moveOrder = null;
        if (S && typeof S.spawnImpactStar === 'function') S.spawnImpactStar(e.clientX, e.clientY, 22);
        return;
      }
    }
    const gy = S ? S.groundY() : window.innerHeight * 0.85;
    ctrl.moveOrder = { x: e.clientX, y: Math.max(window.innerHeight * 0.35, Math.min(gy, e.clientY)) };
    ctrl.chaseOrder = null;
  }

  function wireInput() {
    if (inputWired) return;
    inputWired = true;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointer);
  }

  function unwireInput() {
    if (!inputWired) return;
    inputWired = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerdown', onPointer);
  }

  /* ---------------- combat actions ---------------- */
  function playerDash(ctrl) {
    const u = ctrl.unit;
    const S = saga();
    if (!u || !u.alive || !S) return;
    const now = performance.now();
    if (now < ctrl.dashCd || (u.stunUntil && now < u.stunUntil)) return;
    ctrl.dashCd = now + (PRM.dashCd || 1.2) * 1000;
    ctrl.dashUntil = now + 340;
    if (typeof S.dashTrail === 'function') S.dashTrail(u, 4, 300);
    try { if (window.__sfx && window.__sfx.dashWhoosh) window.__sfx.dashWhoosh(1.1); } catch (e) {}
  }

  function nearestFoe(u) {
    const foes = enemiesOf(u);
    let best = null, bd = Infinity;
    foes.forEach(f => { const d = dist(u, f); if (d < bd) { bd = d; best = f; } });
    return best;
  }

  function championRanged(u, target) {
    const S = saga();
    const M = meta();
    if (!S || !u || !target) return;
    const throwId = u.throwId || (M ? M.custom(u.side).throw : 'burst');
    const key = THROW_CLASS[throwId] || (u.side === 'left' ? 'gunner' : 'wizard');
    const bak = u.cls;
    const pool = sideClasses(u.side);
    u.cls = pool.find(c => c.key === key) || bak;
    S.rangedAttack(u, target);
    later(() => { u.cls = bak; }, 320);
  }

  function playerAttack(ctrl) {
    const u = ctrl.unit;
    const S = saga();
    if (!u || !u.alive || !S) return;
    const now = performance.now();
    if (u.champCd > 0 || (u.stunUntil && now < u.stunUntil) || u.striking) return;
    const foe = ctrl.chaseOrder && ctrl.chaseOrder.alive ? ctrl.chaseOrder : nearestFoe(u);
    const meleeR = (u.meleeRange || 90) + (foe ? (foe.size || 50) * 0.25 : 0);
    if (foe && dist(u, foe) <= meleeR) {
      S.meleeStrike(u, foe);
      u.champCd = (PRM.pCd || 1) * 0.45;
    } else if (foe && dist(u, foe) <= (u.rangedRange || 350)) {
      championRanged(u, foe);
      u.champCd = (u.champCd || 0.55) * 1.1;
    } else if (foe) {
      championRanged(u, foe);
      u.champCd = 0.5;
    }
  }

  function healTeam(u) {
    const S = saga();
    if (!S || !u) return;
    const tribe = u.side === 'left' ? S.leftTribe : S.rightTribe;
    tribe.filter(a => a.alive).forEach(a => {
      const amt = Math.round(a.maxHp * 0.22 * (PRM.specialX || 1));
      a.hp = Math.min(a.maxHp, a.hp + amt);
      S.updateHp(a);
      const c = contactPoint(a);
      S.healPop(c.x, c.y - 18, '+' + amt);
    });
    try { if (window.__sfx && window.__sfx.healChime) window.__sfx.healChime(); } catch (e) {}
  }

  function castSpecial(u) {
    const S = saga();
    const M = meta();
    if (!S || !u) return;
    const id = u.specialId || (M ? M.custom(u.side).special : '');
    const foes = typeof S.foesOf === 'function' ? S.foesOf(u) : enemiesOf(u);
    if (typeof S.warBanner === 'function') S.warBanner((M ? M.specialDef(u.side, id).name : id).toUpperCase(), 'unleashed!', 2200);
    switch (id) {
      case 'airstrike': S.westAirstrike(); break;
      case 'scatter': S.ultScatter(u, foes); break;
      case 'blitz': S.ultBlitz(u, foes); break;
      case 'vanguard': S.triggerSpecial('left'); break;
      case 'medevac': healTeam(u); break;
      case 'dragon': S.eastSpiritDragon(); break;
      case 'thunder':
        foes.slice(0, 7).forEach((t, i) => later(() => { if (t.alive) S.thunderStrike(t); }, i * 200));
        break;
      case 'quake': S.ultQuake(u, foes.filter(f => dist(u, f) < 290)); break;
      case 'frostwave': S.ultFrostWave(u, foes); break;
      case 'mending': healTeam(u); break;
      default: break;
    }
    try { if (window.__sfx && window.__sfx.taiko) window.__sfx.taiko(1); } catch (e) {}
  }

  function playerSpecial(ctrl) {
    const u = ctrl.unit;
    if (!u || !u.alive) return;
    const now = performance.now();
    if (u.stunUntil && now < u.stunUntil) return;
    if (ctrl.mp < MP_MAX) return;
    ctrl.mp = 0;
    playerMp[ctrl.side] = 0;
    if (T) T.ev('specials', 1);
    castSpecial(u);
    updatePlayerHud();
  }

  function applyPlayerPos(u, nx, ny) {
    u.x = nx;
    u.baseY = ny;
    u.y = ny;
    u.el.style.left = nx + 'px';
    u.el.style.top = ny + 'px';
    u._playerPin = { x: nx, y: ny, until: performance.now() + 32 };
  }

  function tickPlayerMovement(dt) {
    const S = saga();
    if (!S || isCutscene()) return;
    const gy = S.groundY();
    const W = window.innerWidth;
    const yMin = window.innerHeight * 0.28;
    const yMax = gy;
    players.forEach(ctrl => {
      const u = ctrl.unit;
      if (!u || !u.alive || !u.playerControlled) return;
      const now = performance.now();
      if (u.stunUntil && now < u.stunUntil) return;
      let vx = 0, vy = 0;
      const sp = (u.champSpeed || 200) * (now < ctrl.dashUntil ? 2.2 : 1);
      if (ctrl.keys.up) vy -= 1;
      if (ctrl.keys.down) vy += 1;
      if (ctrl.keys.left) vx -= 1;
      if (ctrl.keys.right) vx += 1;
      if (vx || vy) {
        const m = Math.hypot(vx, vy) || 1;
        vx = vx / m * sp * dt;
        vy = vy / m * sp * dt;
        ctrl.moveOrder = ctrl.chaseOrder = null;
      } else if (ctrl.chaseOrder && ctrl.chaseOrder.alive) {
        const f = ctrl.chaseOrder;
        const d = dist(u, f);
        const rng = (u.meleeRange || 90) * 0.95;
        if (d > rng) {
          vx = (f.x - u.x) / d * sp * dt;
          vy = ((f.baseY != null ? f.baseY : f.y) - u.baseY) / d * sp * dt;
        } else if (u.champCd <= 0) playerAttack(ctrl);
      } else if (ctrl.moveOrder) {
        const d = Math.hypot(ctrl.moveOrder.x - u.x, ctrl.moveOrder.y - u.baseY);
        if (d > 14) {
          vx = (ctrl.moveOrder.x - u.x) / d * sp * dt;
          vy = (ctrl.moveOrder.y - u.baseY) / d * sp * dt;
        } else ctrl.moveOrder = null;
      }
      let nx = u.x + vx;
      let ny = u.baseY + vy;
      nx = Math.max(W * 0.03, Math.min(W * 0.97, nx));
      ny = Math.max(yMin, Math.min(yMax, ny));
      applyPlayerPos(u, nx, ny);
      if (Math.abs(vx) > 0.5) u.el.classList.toggle('flip-x', vx < 0 ? u.side === 'right' : u.side === 'left');
      const F = foodMod();
      if (F && typeof F.nearestFood === 'function' && typeof F.takeFood === 'function') {
        const c = contactPoint(u);
        const f = F.nearestFood(null, c.x, c.y, 42);
        if (f) {
          F.takeFood(f);
          const amt = Math.round(u.maxHp * (PRM.snackHeal || 0.2));
          u.hp = Math.min(u.maxHp, u.hp + amt);
          S.updateHp(u);
          S.healPop(c.x, c.y - 18, '+' + amt);
          if (T && isPlayerChamp(u)) T.ev('snacks', 1);
        }
      }
    });
    players.forEach(ctrl => {
      const u = ctrl.unit;
      if (!u || !u._playerPin) return;
      if (performance.now() > u._playerPin.until) { u._playerPin = null; return; }
      applyPlayerPos(u, u._playerPin.x, u._playerPin.y);
    });
  }

  function updatePlayerHud() {
    players.forEach(p => {
      const u = p.unit;
      if (!u) return;
      const sfx = p.hud === 2 ? '-2' : '';
      const hpf = u.maxHp ? Math.max(0, u.hp / u.maxHp) : 0;
      const hpEl = document.getElementById('sim-ph-hp' + sfx);
      const mpEl = document.getElementById('sim-ph-mp' + sfx);
      const ready = document.getElementById('sim-ph-ready' + sfx);
      if (hpEl) hpEl.style.width = (hpf * 100) + '%';
      const mpf = p.mp / MP_MAX;
      if (mpEl) mpEl.style.width = (mpf * 100) + '%';
      if (ready) ready.classList.toggle('on', mpf >= 1);
    });
    const sp = document.getElementById('sim-ta-sp');
    if (sp && p1()) sp.classList.toggle('ready', p1().mp >= MP_MAX);
  }

  /* ---------------- saga hooks ---------------- */
  function registerHooks() {
    const S = saga();
    if (!S || !S.hooks) return;

    const beforeCombat = () => {
      if (!active) return;
      if (mode === 'story' && !storyPickDone) {
        later(() => {
          const S2 = saga();
          if (!S2 || !S2.combatRunning || storyPickDone) return;
          S2.combatPaused = true;
          showPick();
        }, 0);
      }
    };

    const onTick = (dt) => {
      if (!active) return;
      players.forEach(p => { if (p.unit) p.unit.champCd = Math.max(0, (p.unit.champCd || 0) - dt); });
      tickPlayerMovement(dt);
      updatePlayerHud();
    };

    const onHit = (att, def, amount, info) => {
      if (!active || !T) return;
      info = info || {};
      if (isPlayerChamp(att)) {
        const gain = (amount || 1) * 0.08 * (PRM.mpGain || 1);
        const ctrl = ctrlOf(att);
        if (ctrl) {
          ctrl.mp = Math.min(MP_MAX, ctrl.mp + gain);
          playerMp[att.side] = ctrl.mp;
        }
        if (info.crit) T.ev('crits', 1);
      }
      if (isPlayerChamp(def) && def.hp <= 0) T.ev('gotBonked', 1);
    };

    const onKill = (att, def) => {
      if (!active || !T) return;
      if (att && isPlayerChamp(att)) T.ev('bonks', 1);
      const ctrl = def && ctrlOf(def);
      if (ctrl && mode !== 'duel') {
        const rest = (def.side === 'left' ? S.leftTribe : S.rightTribe).filter(x => x.alive && x !== def);
        if (rest.length) {
          const next = rest.sort((a, b) => b.hp - a.hp)[0];
          later(() => {
            if (!next.alive) return;
            setPlayerUnit(ctrl, next);
            if (typeof S.warBanner === 'function') {
              S.warBanner('YOU ARE NOW ' + (next.champName || next.faceKey || 'ALLY').toUpperCase(), 'the fight continues', 2600);
            }
          }, 700);
        }
      }
    };

    const afterCombat = (winnerSide) => {
      if (!active) return;
      const isDraw = winnerSide !== 'left' && winnerSide !== 'right';
      const durationS = battleT0 ? (performance.now() - battleT0) / 1000 : 0;
      let won = false;
      if (mode === 'duel') won = !isDraw && players.some(p => p.side === winnerSide);
      else if (mode === 'auto') won = !isDraw && prediction === winnerSide;
      else won = !isDraw && !!(p1() && p1().side === winnerSide);
      if (T) {
        if (mode === 'duel') T.event('duel');
        if (mode === 'auto' && prediction && won) T.event('oracle');
        const fin = T.finish({ won, durationS });
        try { if (window.__sfx && window.__sfx.stopMusic) window.__sfx.stopMusic(); } catch (e) {}
        if (mode === 'story') {
          teardown({ soft: true });
        } else {
          later(() => showPost(winnerSide, won, durationS, fin ? fin.newlyDone : []), 800);
        }
      } else if (mode !== 'story') {
        later(() => showPost(winnerSide, won, durationS, []), 800);
      } else {
        teardown({ soft: true });
      }
    };

    [['beforeCombat', beforeCombat], ['onTick', onTick], ['onHit', onHit], ['onKill', onKill], ['afterCombat', afterCombat]].forEach(([name, fn]) => {
      S.hooks[name].push(fn);
      hookRefs.push({ name, fn });
    });
  }

  function unregisterHooks() {
    const S = saga();
    if (!S || !S.hooks) return;
    hookRefs.forEach(({ name, fn }) => {
      const list = S.hooks[name];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    });
    hookRefs = [];
  }

  /* ---------------- post overlay ---------------- */
  function hidePost() {
    const el = document.getElementById('sim-post-overlay');
    if (el) el.classList.remove('on');
  }

  function showPost(winnerSide, won, durationS, newly) {
    hideHud();
    const M = meta();
    const isDraw = winnerSide !== 'left' && winnerSide !== 'right';
    const title = document.getElementById('sim-po-title');
    const sub = document.getElementById('sim-po-sub');
    const sideLabel = winnerSide === 'left' ? 'WEST' : winnerSide === 'right' ? 'EAST' : '';
    if (mode === 'duel') {
      if (isDraw) {
        if (title) title.textContent = 'DRAW!';
        if (sub) sub.textContent = 'both champions fell';
      } else {
        const pWin = players.find(p => p.side === winnerSide);
        if (title) title.textContent = 'PLAYER ' + (pWin ? pWin.hud : '?') + ' WINS!';
        if (sub) sub.textContent = (M ? M.custom(winnerSide).name : '') + ' stands tall';
      }
    } else if (mode === 'auto') {
      if (isDraw) {
        if (title) title.textContent = 'DRAW!';
        if (sub) sub.textContent = 'everyone bonked out';
      } else {
        if (title) title.textContent = sideLabel + ' WINS!';
        if (sub) sub.textContent = prediction ? (won ? 'the oracle was right' : 'your side got flattened') : 'what a scrap';
      }
    } else {
      if (title) title.textContent = won ? 'VICTORY!!' : 'ALL BONKED…';
      if (sub) sub.textContent = won ? 'the field is yours' : 'try again anytime';
    }
    const s = T ? T.stats : { bonks: 0, crits: 0, specials: 0, snacks: 0 };
    const mins = Math.floor(durationS / 60);
    const secs = Math.round(durationS % 60);
    const tstr = (mins ? mins + 'm ' : '') + secs + 's';
    const statsEl = document.getElementById('sim-po-stats');
    if (statsEl) {
      statsEl.innerHTML = mode === 'auto'
        ? `<div class="po-stat"><b>${tstr}</b><span>TIME</span></div><div class="po-stat"><b>${prediction ? (won ? 'yes' : 'no') : '—'}</b><span>YOUR BET</span></div>`
        : `<div class="po-stat"><b>${s.bonks}</b><span>BONKS</span></div><div class="po-stat"><b>${s.crits}</b><span>CRITS</span></div>
           <div class="po-stat"><b>${s.specials}</b><span>SPECIALS</span></div><div class="po-stat"><b>${s.snacks}</b><span>SNACKS</span></div>
           <div class="po-stat"><b>${tstr}</b><span>TIME</span></div>`;
    }
    const unlocks = document.getElementById('sim-po-unlocks');
    if (unlocks) {
      unlocks.innerHTML = (newly || []).map(ch =>
        `<span class="po-unlock">${ch.name}${M ? ' — ' + M.rewardText(ch.id) : ''}</span>`).join('');
    }
    const btns = document.getElementById('sim-po-btns');
    if (btns) {
      btns.innerHTML = '';
      const mk = (label, small, fn, primary) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice-btn';
        if (primary) { b.style.background = 'var(--ink,#3a2218)'; b.style.color = 'var(--paper,#f3ecd8)'; }
        b.innerHTML = label + (small ? `<small>${small}</small>` : '');
        b.addEventListener('click', fn);
        btns.appendChild(b);
      };
      mk(mode === 'auto' ? 'Run it back' : 'Rematch', 'same loadouts', () => { hidePost(); BT.rematch(); }, !won);
      mk('Back to Menu', 'leave the field', () => {
        hidePost();
        BT.teardown();
        const G = gameMod();
        if (G && typeof G.toMenu === 'function') G.toMenu();
        else { const S = saga(); if (S && typeof S.reZero === 'function') S.reZero(); }
      }, false);
    }
    document.getElementById('sim-post-overlay').classList.add('on');
  }

  function applySagaBattleFlags() {
    const S = saga();
    if (!S) return;
    if (mode === 'quick' || mode === 'duel' || mode === 'auto') {
      S.suppressFinale = true;
      S.endCondition = ({ aliveL, aliveR }) => {
        if (aliveL === 0) return { winner: 'right' };
        if (aliveR === 0) return { winner: 'left' };
        return null;
      };
    } else {
      S.suppressFinale = false;
      S.endCondition = null;
    }
  }

  function clearSagaBattleFlags() {
    const S = saga();
    if (!S) return;
    S.suppressFinale = false;
    S.endCondition = null;
  }

  /* ---------------- lifecycle ---------------- */
  function resetState() {
    PRM = (meta() && typeof meta().effective === 'function') ? meta().effective() : {};
    players = [];
    champs = { left: null, right: null };
    playerMp = { left: 0, right: 0 };
    T = null;
    prediction = null;
    pickSides = {};
    duelPickStep = 0;
    storyPickDone = false;
    standaloneReady = false;
    battleT0 = 0;
    clearLocalTimers();
  }

  BT.start = function start(opts) {
    opts = opts || {};
    if (active) return;
    ensureDom();
    resetState();
    active = true;
    mode = opts.mode || 'story';
    lastOpts = Object.assign({}, opts);
    applySagaBattleFlags();
    registerHooks();

    if (mode === 'story') {
      storyPickDone = !!opts.skipPick;
      if (opts.side) pickSides.p1 = opts.side;
      if (!storyPickDone && saga() && saga().state === 'ch3' && saga().combatRunning) {
        saga().combatPaused = true;
        showPick();
      }
    } else if (mode === 'quick' || mode === 'duel' || mode === 'auto') {
      if (opts.skipPick && (opts.side !== undefined || mode === 'auto')) {
        prepArena();
        if (mode === 'auto') prediction = opts.side != null ? opts.side : null;
        else pickSides.p1 = opts.side || 'left';
        launchStandaloneBattle(mode === 'auto' ? null : pickSides.p1);
      } else {
        prepArena();
        showPick();
      }
    }
  };

  BT.teardown = function teardown(o) {
    o = o || {};
    if (!active && !o.force) return;
    active = false;
    unregisterHooks();
    unwireInput();
    closePick();
    hidePost();
    hideHud();
    document.body.classList.remove('duel-on');
    clearSagaBattleFlags();
    clearLocalTimers();
    players.forEach(p => {
      if (p.unit && p.unit.el) p.unit.el.classList.remove('is-player');
    });
    players = [];
    if (o.soft || mode === 'story') {
      storyPickDone = false;
      champs = { left: null, right: null };
      return;
    }
    const S = saga();
    if (S && typeof S.reZero === 'function') S.reZero();
    standaloneReady = false;
    resetState();
  };

  BT.rematch = function rematch() {
    const side = pickSides.p1 || (lastOpts && lastOpts.side) || 'left';
    BT.teardown({ force: true });
    BT.start(Object.assign({}, lastOpts, { mode, skipPick: true, side: mode === 'auto' ? undefined : side }));
  };

  BT.isActive = function isActive() { return active; };

  function triggerStoryPickAfterCombatInit() {
    if (storyPickDone) return;
    later(() => {
      const S = saga();
      if (!S || !S.combatRunning || storyPickDone) return;
      S.combatPaused = true;
      showPick();
    }, 0);
  }

  function registerPermanentStoryHook() {
    if (permanentHookDone) return true;
    const S = saga();
    if (!S || !S.hooks) return false;
    permanentHookDone = true;
    if (sagaHookRetry) { clearInterval(sagaHookRetry); sagaHookRetry = null; }

    const permanentBeforeCombat = () => {
      if (storyCombatAttached || active) return;
      const S2 = saga();
      if (!S2 || S2.state !== 'ch3' || S2.suppressFinale) return;
      storyCombatAttached = true;
      BT.start({ mode: 'story' });
      triggerStoryPickAfterCombatInit();
    };

    const permanentAfterCombat = () => {
      storyCombatAttached = false;
    };

    S.hooks.beforeCombat.push(permanentBeforeCombat);
    S.hooks.afterCombat.push(permanentAfterCombat);
    return true;
  }

  function tryRegisterPermanentStoryHook() {
    if (registerPermanentStoryHook()) return;
    if (!sagaHookRetry) {
      sagaHookRetry = setInterval(() => registerPermanentStoryHook(), 150);
    }
  }

  tryRegisterPermanentStoryHook();
})();
