/* =====================================================================
   THE GREAT BONK — mode-aware battle engine.
   Modes:
     story — chapter three of the saga (curtain, narration, finale after)
     quick — straight to character select & the fight
     duel  — two players, one keyboard, champions only
     auto  — both armies run on their own little brains; you may bet
   Everything is tuned by SS.meta params × difficulty, loadouts come
   from saved customization, and challenges are tracked live.
   ===================================================================== */
(function () {
  const rand = SS.rand, pick = SS.pick;
  const W = SS.world;
  const M = SS.meta;
  const BT = {};
  SS.battle = BT;

  /* ---------------- class kits (base numbers; params scale them) ---------------- */
  const KITS = {
    sq: [
      { key: 'scamper', name: 'Scamperer',       hp: 150, dmg: 13, range: 72,  speed: 165, cd: 0.6,  melee: true },
      { key: 'pelter',  name: 'Acorn Pelter',    hp: 118, dmg: 11, range: 320, speed: 135, cd: 0.95, proj: 'acorn' },
      { key: 'lobber',  name: 'Pinecone Lobber', hp: 124, dmg: 16, range: 420, speed: 105, cd: 1.8,  proj: 'pinecone', splash: 78, arc: 220 },
      { key: 'medic',   name: 'Berry Medic',     hp: 132, dmg: 6,  range: 270, speed: 125, cd: 1.5,  proj: 'berry', healer: true, heal: 15 }
    ],
    sl: [
      { key: 'slammer', name: 'Belly Slammer',   hp: 200, dmg: 16, range: 80,  speed: 100, cd: 0.8,  melee: true, kb: 2.1 },
      { key: 'squirt',  name: 'Squirter',        hp: 128, dmg: 12, range: 310, speed: 115, cd: 0.9,  proj: 'drop' },
      { key: 'snow',    name: 'Snow Lobber',     hp: 136, dmg: 14, range: 400, speed: 95,  cd: 1.7,  proj: 'snowball', splash: 66, arc: 200, slow: true },
      { key: 'singer',  name: 'Song Healer',     hp: 134, dmg: 6,  range: 260, speed: 105, cd: 1.5,  healer: true, heal: 15, song: true }
    ]
  };
  const CHAMPS = {
    sq: { title: 'Champion of the Meadow', hp: 430, dmg: 20, melee: 92, range: 350, speed: 240, cdM: 0.42, cdR: 0.62 },
    sl: { title: 'Champion of the Shore',  hp: 480, dmg: 22, melee: 100, range: 330, speed: 205, cdM: 0.5,  cdR: 0.7, kb: 2.2 }
  };
  const CRIES = {
    sq: ['FOR THE OAK!!', 'chk chk chk!!', 'fluff UP!!', 'acorns remember!!', 'tails high!!'],
    sl: ['FOR THE TIDE!!', 'ARF ARF ARF!!', 'belly power!!', 'the sea sees all!!', 'flippers up!!']
  };

  /* ---------------- state ---------------- */
  let PRM = null;                    // effective params for this battle
  let mode = 'story';
  let lastOpts = null;
  let units = [];
  let champs = { west: null, east: null };   // champion units
  let players = [];                  // human controllers
  let mp = { west: 0, east: 0 };
  const MP_MAX = 100;
  let running = false, over = false, rafId = null, lastTs = 0;
  let tscale = 1;                    // auto-mode fast-forward
  let finalDuel = false, showdown = false;
  let battleT0 = 0, lastAISpec = { west: 0, east: 0 };
  let reinforced = { west: false, east: false };
  let prediction = null;             // auto-mode bet
  let T = null;                      // meta battle tracker
  let duelPickStep = 0;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const rep = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  const clearAll = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; };

  const enemiesOf = (u) => units.filter(o => o.side !== u.side && o.alive);
  const alliesOf = (u) => units.filter(o => o.side === u.side && o.alive && o !== u);
  const sideUnits = (s) => units.filter(o => o.side === s && !o.temp);
  const spOf = (side) => side === 'west' ? 'sq' : 'sl';
  const ctrlOf = (u) => players.find(p => p.unit === u) || null;
  const isHuman = (u) => !!ctrlOf(u);
  const p1 = () => players[0] || null;
  const humanSides = () => players.map(p => p.side);
  const playerSide = () => (mode === 'quick' || mode === 'story') && players[0] ? players[0].side : null;

  /* ---------------- one-time DOM ---------------- */
  let domReady = false;
  function ensureDom() {
    if (domReady) return;
    domReady = true;
    /* second player hud */
    const hud = document.getElementById('player-hud');
    const hud2 = hud.cloneNode(true);
    hud2.id = 'player-hud-2';
    hud2.classList.add('p2');
    hud2.querySelectorAll('[id]').forEach(el => { el.id = el.id + '-p2'; });
    hud.parentNode.insertBefore(hud2, hud.nextSibling);
    const tag1 = document.createElement('div');
    tag1.className = 'ph-tag'; tag1.textContent = 'PLAYER 1'; tag1.id = 'ph-tag-1';
    hud.insertBefore(tag1, hud.firstChild);
    const tag2 = document.createElement('div');
    tag2.className = 'ph-tag'; tag2.textContent = 'PLAYER 2';
    hud2.insertBefore(tag2, hud2.firstChild);
    document.getElementById('ph-ready-p2').textContent = '✦ special ready — press K ✦';
    /* duel controls hint */
    const dh = document.createElement('div');
    dh.className = 'duel-hint';
    dh.id = 'duel-hint';
    dh.innerHTML = `<span><b>P1</b> <b>WASD</b> move · <b>F</b> bonk · <b>G</b> special · <b>H</b> dash</span>
      &nbsp;·&nbsp; <span><b>P2</b> <b>←↑↓→</b> move · <b>J</b> bonk · <b>K</b> special · <b>L</b> dash</span>`;
    document.body.appendChild(dh);
    /* auto hud */
    const ah = document.createElement('div');
    ah.className = 'auto-hud';
    ah.id = 'auto-hud';
    ah.innerHTML = `<button id="auto-speed">▶ 1× speed</button><button id="auto-skip">skip to the end ▸</button>`;
    document.body.appendChild(ah);
    document.getElementById('auto-speed').addEventListener('click', () => {
      tscale = tscale >= 4 ? 1 : tscale * 2;
      document.getElementById('auto-speed').textContent = '▶ ' + tscale + '× speed';
    });
    document.getElementById('auto-skip').addEventListener('click', () => BT.skip());
    /* post-battle overlay */
    const po = document.createElement('div');
    po.className = 'post-overlay';
    po.id = 'post-overlay';
    po.setAttribute('data-screen-label', 'After the battle');
    po.innerHTML = `<div class="post-card">
      <div class="po-title" id="po-title"></div>
      <div class="po-sub" id="po-sub"></div>
      <div class="po-stats" id="po-stats"></div>
      <div class="po-unlocks" id="po-unlocks"></div>
      <div class="po-btns" id="po-btns"></div>
    </div>`;
    document.body.appendChild(po);
  }

  /* ---------------- units ---------------- */
  function makeUnit(c, side, cls, isChamp) {
    c.el.classList.add('in-battle');
    const u = {
      c, side, cls: Object.assign({}, cls), isChamp: !!isChamp,
      base: { hp: cls.hp, dmg: cls.dmg, speed: cls.speed },
      hp: cls.hp, maxHp: cls.hp,
      cd: rand(0.2, 1), thinkAt: 0, target: null,
      flankY: rand(-85, 85), flankX: rand(-30, 30),
      kbx: 0, kby: 0, slowUntil: 0, stunUntil: 0, guardUntil: 0, striking: false,
      alive: true
    };
    c.setHp(1);
    c.el.__unit = u;
    return u;
  }

  function tuneUnits() {
    const hSides = humanSides();
    units.forEach(u => {
      const b = u.base;
      let hp = b.hp, dmg = b.dmg, spd = b.speed;
      if (u.isChamp) {
        const sp = spOf(u.side);
        hp *= M.upMul(sp, 'upHp'); dmg *= M.upMul(sp, 'upDmg'); spd *= M.upMul(sp, 'upSpd');
      }
      if (mode === 'duel') {
        hp *= PRM.duelHp;
      } else if (mode === 'auto') {
        /* neutral */
      } else if (hSides.includes(u.side)) {
        if (isHuman(u) || u.isChamp) { hp *= PRM.pHp; dmg *= PRM.pDmg; spd *= PRM.pSpd; u.cdMul = PRM.pCd; }
        else { hp *= PRM.aHp; dmg *= PRM.aDmg; }
      } else {
        hp *= PRM.eHp; dmg *= PRM.eDmg; spd *= PRM.eSpd;
      }
      const frac = u.maxHp ? Math.max(0, u.hp / u.maxHp) : 1;
      u.maxHp = Math.round(hp);
      u.hp = u.maxHp * frac;
      u.cls.dmg = dmg;
      u.cls.speed = spd;
      u.c.setHp(frac);
    });
    updateTeamHud();
  }

  function normalizeTribes(n) {
    ['west', 'east'].forEach(side => {
      const sp = spOf(side);
      let arr = (SS.tribes[side] || []).filter(c => c.alive && c.el.isConnected && !c.el.classList.contains('champion'));
      while (arr.length > n) {
        const c = arr.pop();
        c.moveTo(side === 'west' ? -160 : W.vw() + 160, c.y, 130, () => W.removeCritter(c));
      }
      while (arr.length < n) {
        const c = W.addCritter({ species: sp, size: sp === 'sq' ? rand(90, 116) : rand(102, 130) });
        const p = side === 'west' ? W.randGround(0.04, 0.4) : W.randGround(0.6, 0.94);
        c.place(p.x, p.y);
        if (SS.playground) SS.playground.wirePetting(c);
        arr.push(c);
      }
      SS.tribes[side] = arr;
    });
  }

  function makeChampion(side, entrance) {
    const sp = spOf(side);
    const CH = CHAMPS[sp];
    const cust = M.custom(sp);
    const c = W.addCritter({ species: sp, size: cust.size, variant: cust.variant, name: cust.name });
    c.el.classList.add('champion');
    if (SS.outfits) SS.outfits.apply(c, M.outfitOf(sp));
    const fd = M.faceDef(cust.face);
    if (c.setRestFace) c.setRestFace(fd.eyes, fd.mouth);
    const y = (W.groundTop() + W.groundBot()) / 2;
    c.place(side === 'west' ? -140 : W.vw() + 140, y + (side === 'west' ? -20 : 20));
    const cls = {
      key: 'champ', name: CH.title, hp: CH.hp, dmg: CH.dmg, range: CH.range,
      melee: true, meleeRange: CH.melee, speed: CH.speed, cd: CH.cdM, cdR: CH.cdR, kb: CH.kb || 1.4
    };
    const u = makeUnit(c, side, cls, true);
    u.champName = cust.name;
    u.specialId = cust.special;
    u.throwMod = (SS.specials && SS.specials.THROW_MODS[cust.throw]) || { kind: sp === 'sq' ? 'acorn' : 'drop' };
    units.push(u);
    champs[side] = u;
    later(() => {
      const tx = mode === 'duel' ? W.vw() * (side === 'west' ? 0.3 : 0.7) : W.vw() * (side === 'west' ? 0.40 : 0.60);
      c.moveTo(tx, y, sp === 'sq' ? 190 : 130, () => {
        c.face(side === 'west' ? 'r' : 'l');
        if (entrance) { c.say(cust.name + ' is here!!', 2200); c.oneShot('jump', 740); }
      });
    }, entrance ? 600 : 100);
    return u;
  }

  function arrangeRanks() {
    units = [];
    champs = { west: null, east: null };
    if (mode !== 'duel') {
      normalizeTribes(Math.round(PRM.units));
      const gT = W.groundTop(), gB = W.groundBot();
      ['west', 'east'].forEach(side => {
        const kit = KITS[spOf(side)];
        SS.tribes[side].forEach((c, i) => {
          if (!c.alive) return;
          const cls = kit[i % kit.length];
          const u = makeUnit(c, side, cls);
          units.push(u);
          const col = Math.floor(i / 3), row = i % 3;
          const x = side === 'west' ? W.vw() * (0.26 - col * 0.09) : W.vw() * (0.74 + col * 0.09);
          const y = gT + 60 + row * ((gB - gT - 80) / 2.2);
          c.stopMove(); c._crewed = true; c._busy = false;
          c.moveTo(x + rand(-14, 14), y + rand(-10, 10), c.species === 'sq' ? 150 : 95, () => {
            c.face(side === 'west' ? 'r' : 'l');
            c.setFace('angry', 'frown');
          });
        });
      });
    }
    makeChampion('west', true);
    makeChampion('east', true);
  }

  /* ---------------- pick overlay ---------------- */
  function loadoutList(sp, kind) {
    const cust = M.custom(sp);
    const defs = kind === 'special' ? M.SPECIALS[sp] : M.THROWS[sp];
    const cur = kind === 'special' ? cust.special : cust.throw;
    return defs.map(d => {
      const un = M.unlocked(d.unlock);
      return `<div class="load-opt ${un ? '' : 'locked'} ${cur === d.id ? 'sel' : ''}" data-sp="${sp}" data-kind="${kind}" data-id="${d.id}">
        <span class="dot"></span>
        <span>${un ? '' : '🔒 '}${d.name} <span class="sub">— ${un ? d.desc : M.unlockHint(d.unlock)}</span></span>
      </div>`;
    }).join('');
  }

  function pickCard(sp, side) {
    const cust = M.custom(sp);
    const card = document.createElement('div');
    card.className = 'pick-card';
    card.dataset.side = side;
    const desc = sp === 'sq' ? 'quick paws, quicker tail' : 'a wall of blubber — slower, tougher';
    let btnLabel = 'Fight as ' + cust.name;
    if (mode === 'duel') btnLabel = (duelPickStep === 0 ? 'Player 1: ' : 'Player 2: ') + 'take ' + cust.name;
    if (mode === 'auto') btnLabel = 'cheer for the ' + (sp === 'sq' ? 'squirrels' : 'seals');
    card.innerHTML = `
      <div class="pc-art">${SS.outfits ? SS.outfits.portrait(sp, cust) : SS.portrait(sp, cust.variant)}</div>
      <div class="pc-name">${cust.name}</div>
      <div class="pc-desc">${desc} · ${CHAMPS[sp].title.toLowerCase()}</div>
      <div class="load-h">SPECIAL (K)</div>
      <div class="load-list">${loadoutList(sp, 'special')}</div>
      <div class="load-h">THROW</div>
      <div class="load-list">${loadoutList(sp, 'throw')}</div>
      <button class="pc-fight">${btnLabel}</button>`;
    card.querySelectorAll('.load-opt').forEach(el => {
      el.addEventListener('click', () => {
        if (el.classList.contains('locked')) {
          W.warBanner('LOCKED', el.querySelector('.sub').textContent.replace('— ', ''), 1800);
          return;
        }
        M.setCustom(sp, el.dataset.kind === 'special' ? { special: el.dataset.id } : { throw: el.dataset.id });
        refreshPick();
      });
    });
    card.querySelector('.pc-fight').addEventListener('click', () => onPickSide(side));
    return card;
  }

  let pickSides = {};
  function refreshPick() {
    const row = document.getElementById('pick-row');
    row.innerHTML = '';
    [['sq', 'west'], ['sl', 'east']].forEach(([sp, side]) => {
      const card = pickCard(sp, side);
      if (mode === 'duel' && duelPickStep === 1 && pickSides.p1 === side) card.classList.add('dim');
      row.appendChild(card);
    });
    let note = document.getElementById('pick-note');
    if (!note) {
      note = document.createElement('div');
      note.className = 'pick-mini-note';
      note.id = 'pick-note';
      document.getElementById('pick-overlay').appendChild(note);
    }
    note.innerHTML = mode === 'auto' ? `or <button id="pick-nobet">just watch — no bets</button>` : '';
    const nb = document.getElementById('pick-nobet');
    if (nb) nb.addEventListener('click', () => { prediction = null; closePick(); beginBattle(null); });
  }

  function showPick() {
    duelPickStep = 0; pickSides = {};
    const title = document.getElementById('pick-title');
    const sub = document.getElementById('pick-sub');
    if (mode === 'duel') { title.textContent = 'Player 1 — choose your champion'; sub.textContent = 'player 2 gets the other one. loadouts are fair game for both.'; }
    else if (mode === 'auto') { title.textContent = 'The armies take the field'; sub.textContent = 'tune both loadouts, then back a side — a correct call completes a challenge'; }
    else { title.textContent = 'Choose your champion'; sub.textContent = 'this fight is yours to win — pick a side, pick a loadout'; }
    refreshPick();
    document.getElementById('pick-overlay').classList.add('on');
    rep(() => {
      if (running) return;
      const u = pick(units.filter(x => x.alive && !x.isChamp));
      if (u) u.c.say(pick(CRIES[u.c.species]), 1700);
    }, 2600);
  }
  function closePick() { document.getElementById('pick-overlay').classList.remove('on'); }

  function onPickSide(side) {
    if (mode === 'auto') { prediction = side; closePick(); beginBattle(null); return; }
    if (mode === 'duel') {
      if (duelPickStep === 0) {
        pickSides.p1 = side;
        duelPickStep = 1;
        document.getElementById('pick-title').textContent = 'Player 2 — your champion';
        document.getElementById('pick-sub').textContent = 'tune your loadout, then hit ready';
        const otherSide = side === 'west' ? 'east' : 'west';
        pickSides.p2 = otherSide;
        refreshPick();
        const btn = document.querySelector(`.pick-card[data-side="${otherSide}"] .pc-fight`);
        if (btn) btn.textContent = 'Player 2 ready — FIGHT!';
        return;
      }
      closePick();
      beginBattle(pickSides.p1);
      return;
    }
    closePick();
    beginBattle(side);
  }

  /* ---------------- battle begin ---------------- */
  function makeController(side, hudIdx) {
    const u = champs[side];
    return { side, unit: u, keys: {}, dashUntil: 0, dashCd: 0, moveOrder: null, chaseOrder: null, hud: hudIdx };
  }

  function beginBattle(side) {
    document.body.classList.add('battle-on');
    players = [];
    if (mode === 'duel') {
      players.push(makeController(side || 'west', 1));
      players.push(makeController(side === 'west' ? 'east' : 'west', 2));
      document.body.classList.add('duel-on');
      document.getElementById('duel-hint').classList.add('on');
      document.getElementById('player-hud').classList.add('on');
      document.getElementById('player-hud-2').classList.add('on');
    } else if (mode === 'auto') {
      document.getElementById('team-hud').classList.add('on');
      document.getElementById('auto-hud').classList.add('on');
      tscale = 1;
      document.getElementById('auto-speed').textContent = '▶ 1× speed';
    } else {
      players.push(makeController(side, 1));
      document.getElementById('team-hud').classList.add('on');
      document.getElementById('controls-hint').classList.add('on');
      document.getElementById('touch-actions').classList.add('on');
      document.getElementById('player-hud').classList.add('on');
    }
    document.getElementById('ph-tag-1').style.display = mode === 'duel' ? '' : 'none';
    players.forEach(p => setPlayerUnit(p, p.unit, true));
    tuneUnits();
    updateTeamHud();

    T = M.beginBattle({ mode, side: playerSide() || side || null, difficulty: M.difficulty() });
    T.onUnlock = (ch) => {
      W.warBanner('✶ CHALLENGE COMPLETE ✶', ch.name + ' — unlocked: ' + M.rewardText(ch.id), 3000);
      if (window.__sfx) window.__sfx.healChime();
    };

    const msgs = mode === 'auto' ? ['THE ARMIES MEET…', 'GO!!!'] : ['READY…', '3', '2', '1', 'GO!!!'];
    msgs.forEach((m, i) => later(() => {
      W.warBanner(m, i === msgs.length - 1 ? (mode === 'auto' ? (prediction ? 'you backed the ' + (prediction === 'west' ? 'squirrels' : 'seals') : 'no bets placed') : 'bonk them all!') : '', i === msgs.length - 1 ? 1600 : 850);
      if (window.__sfx) window.__sfx.taiko(0.55 + i * 0.1);
    }, 400 + i * 750));
    later(() => {
      try {
        if (window.__sfx) { window.__sfx.chargeHorn && window.__sfx.chargeHorn(); window.__sfx.startMusic('battle', { volume: 0.4 }); }
        units.forEach(u => {
          if (!u.alive) return;
          u.c.say(pick(CRIES[u.c.species]), 1400);
          u.c.setFace('angry', 'frown');
        });
      } catch (e) { console.error('battle-cry', e); }
    }, 400 + msgs.length * 750);
    later(() => { running = true; battleT0 = performance.now(); lastTs = 0; rafId = requestAnimationFrame(loop); }, 400 + msgs.length * 750 + 500);
    rep(() => {
      if (!running || over) return;
      if (W.foods.length < 4) {
        const p = W.randGround(0.08, 0.92);
        W.spawnFood(Math.random() < 0.5 ? 'acorn' : 'fish', p.x, p.y);
      }
    }, Math.max(1500, PRM.snackEvery * 1000));
  }

  function setPlayerUnit(ctrl, u, silent) {
    if (ctrl.unit && ctrl.unit.c) ctrl.unit.c.el.classList.remove('is-player');
    ctrl.unit = u;
    u.cheering = false;
    u.c.el.classList.add('is-player');
    const sfx = ctrl.hud === 2 ? '-p2' : '';
    document.getElementById('ph-portrait' + sfx).innerHTML = SS.portrait(u.c.species, u.c.variant);
    document.getElementById('ph-name' + sfx).textContent = u.isChamp ? u.champName : u.c.name;
    document.getElementById('ph-class' + sfx).textContent = u.isChamp ? CHAMPS[spOf(u.side)].title : ('the ' + u.cls.name);
    updatePlayerHud();
    if (!silent) SS.fx.ring(u.c);
  }

  /* ---------------- input ---------------- */
  const KEYS_1P = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
  const KEYS_D1 = { w: 'up', s: 'down', a: 'left', d: 'right' };
  const KEYS_D2 = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
  function onKeyDown(e) {
    if (!running || over || document.body.classList.contains('menu-open')) return;
    const k = e.key.toLowerCase();
    if (mode === 'duel') {
      const c1 = players[0], c2 = players[1];
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
    if (!running || over || mode === 'duel' || mode === 'auto' || document.body.classList.contains('menu-open')) return;
    const ctrl = p1();
    if (!ctrl || !ctrl.unit.alive) return;
    const t = e.target.closest ? e.target.closest('.critter') : null;
    if (t && t.__unit && t.__unit.side !== ctrl.side && t.__unit.alive) {
      ctrl.chaseOrder = t.__unit; ctrl.moveOrder = null;
      SS.fx.impactStar(e.clientX, e.clientY, 22);
    } else if (!e.target.closest('.player-hud,.touch-actions,.saga-hud,.controls-hint,.team-hud,.post-overlay,.gm-overlay,button')) {
      ctrl.moveOrder = { x: e.clientX, y: Math.max(W.groundTop() + 10, Math.min(W.groundBot(), e.clientY)) };
      ctrl.chaseOrder = null;
      SS.fx.dust(e.clientX, e.clientY, 2, [6, 12]);
    }
  }
  let inputWired = false;
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
  /* touch buttons always drive player 1 */
  document.getElementById('ta-atk').addEventListener('click', () => { if (p1()) playerAttack(p1()); });
  document.getElementById('ta-dash').addEventListener('click', () => { if (p1()) playerDash(p1()); });
  document.getElementById('ta-sp').addEventListener('click', () => { if (p1()) playerSpecial(p1()); });

  function playerDash(ctrl) {
    const u = ctrl.unit;
    if (!u || !u.alive) return;
    const now = performance.now();
    if (now < ctrl.dashCd || now < u.stunUntil) return;
    ctrl.dashCd = now + PRM.dashCd * 1000;
    ctrl.dashUntil = now + 340;
    u.c.setAction('dash');
    SS.fx.dashTrail(u.c, 4, 300);
    if (window.__sfx) window.__sfx.dashWhoosh(u.c.species === 'sl' ? 0.8 : 1.15);
    if (u.c.species === 'sl') {
      const r = u.c.el.getBoundingClientRect();
      SS.fx.splash(r.left + r.width / 2, r.bottom - 6, 4);
    }
  }

  function playerAttack(ctrl) {
    const u = ctrl.unit;
    if (!u || !u.alive || u.cd > 0 || performance.now() < u.stunUntil) return;
    const meleeR = (u.cls.meleeRange || u.cls.range) * u.c.scale;
    const foes = enemiesOf(u);
    let best = null, bd = 1e9;
    foes.forEach(f => { const d = dist(u, f); if (d < bd) { bd = d; best = f; } });
    const cdMul = u.cdMul || 1;
    if (best && bd <= meleeR + best.c.size * 0.3) {
      doMelee(u, best);
      u.cd = u.cls.cd * cdMul;
    } else if (best && bd <= (u.cls.range || 320) * 1.15) {
      doShot(u, best);
      u.cd = (u.cls.cdR || 0.65) * cdMul * ((u.throwMod && u.throwMod.cdMul) || 1);
    } else {
      const dirX = u.c.dir === 'l' ? -1 : 1;
      fireProj(u, { x: u.c.x + dirX * 280, y: u.c.y - 20, alive: false }, true);
      u.cd = 0.5 * cdMul;
    }
  }

  function playerSpecial(ctrl) {
    const u = ctrl.unit;
    if (!u || !u.alive || over || performance.now() < u.stunUntil) return;
    if (mp[ctrl.side] < MP_MAX) {
      u.c.say('not enough spirit yet!', 1300);
      return;
    }
    mp[ctrl.side] = 0;
    if (T) T.ev('specials');
    doSpecial(u);
  }

  /* ---------------- combat ---------------- */
  function dist(a, b) { return Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y); }
  function contactPoint(u) {
    const r = u.c.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
  }
  function gainMp(side, amt) {
    mp[side] = Math.min(MP_MAX, mp[side] + amt * PRM.mpGain);
    updatePlayerHud();
  }

  function applyDamage(att, def, dmg, opts = {}) {
    if (!def.alive || over) return;
    const now = performance.now();
    const crit = Math.random() < PRM.crit;
    let inv = 1;
    if (mode === 'quick' || mode === 'story') {
      if (isHuman(att)) inv = 1.25;
      else if (isHuman(def)) inv = 0.75;
      else {
        const elapsed = battleT0 ? now - battleT0 : 0;
        inv = elapsed > 240000 ? Math.min(1, PRM.invArmy + ((elapsed - 240000) / 120000) * (1 - PRM.invArmy)) : PRM.invArmy;
      }
      if (showdown && def.isChamp && !humanSides().includes(def.side) && !isHuman(att)) inv = 0.12;
    }
    let amount = dmg * inv * (crit ? PRM.critX : 1) * (finalDuel ? 1.3 : 1);
    if (def.guardUntil && now < def.guardUntil) amount *= 0.45;
    if (amount < 1) amount = 1;
    def.hp -= amount;
    def.c.setHp(Math.max(0, def.hp / def.maxHp));
    def.c.oneShot('hurt', 300);
    def.c.flashFace('ouch', 'open', 700);
    const cp = contactPoint(def);
    SS.fx.dmgPop(cp.x + rand(-8, 8), cp.y - 20, crit ? 'BONK!' : Math.round(amount), crit);
    if (crit) {
      SS.fx.impactStar(cp.x, cp.y, 52);
      W.hitstop(90);
      if (T && isHuman(att)) T.ev('crits');
    }
    const dirX = def.c.x >= att.c.x ? 1 : -1;
    const kb = (opts.kb || 1) * (crit ? 1.5 : 1) * PRM.kb;
    def.kbx += dirX * 90 * kb;
    def.kby += rand(-24, 24);
    if (opts.slow) def.slowUntil = now + 1700;
    if (window.__sfx) window.__sfx.hit();
    gainMp(att.side, isHuman(att) || att.isChamp ? 9 : 2);
    gainMp(def.side, isHuman(def) || def.isChamp ? 5 : 2);
    if (def.hp <= 0) down(def, att);
    updateTeamHud();
  }

  function heal(healer, target, amt) {
    if (!target.alive) return;
    target.hp = Math.min(target.maxHp, target.hp + amt);
    target.c.setHp(target.hp / target.maxHp);
    const cp = contactPoint(target);
    SS.fx.dmgPop(cp.x, cp.y - 22, '♪ +' + Math.round(amt), false, true);
    SS.fx.ring(target.c, true);
    if (window.__sfx) window.__sfx.healChime();
    updateTeamHud();
    updatePlayerHud();
  }

  function doMelee(u, foe) {
    u.striking = true;
    u.c.face(foe.c.x < u.c.x ? 'l' : 'r');
    u.c.oneShot('strike', 320, () => { u.striking = false; });
    if (window.__sfx) window.__sfx.dashWhoosh(1.2);
    later(() => {
      if (!foe.alive || !u.alive) return;
      if (dist(u, foe) > (u.cls.meleeRange || u.cls.range) * u.c.scale * 1.45 + foe.c.size * 0.3) return;
      const cp = contactPoint(foe);
      SS.fx.impactStar(cp.x, cp.y, u.c.species === 'sl' ? 50 : 40);
      SS.fx.dust(cp.x, cp.y + 16, 3, [8, 18]);
      if (u.c.species === 'sl' && window.__sfx) window.__sfx.giantStomp();
      W.hitstop(u.c.species === 'sl' ? 110 : 70);
      applyDamage(u, foe, u.cls.dmg, { kb: u.cls.kb || 1 });
    }, 160);
  }

  function fireProj(u, foe, whiff) {
    const tm = u.isChamp ? u.throwMod : null;
    const kind = (tm && tm.kind) || u.cls.proj || (u.c.species === 'sq' ? 'acorn' : 'drop');
    const count = (tm && tm.count) || 1;
    const dmgMul = (tm && tm.dmgMul) || 1;
    const splash = (tm && tm.splash) || u.cls.splash;
    const slow = (tm && tm.slow) || u.cls.slow;
    const shoot = (n) => {
      if (!u.alive) return;
      const r = u.c.el.getBoundingClientRect();
      const x1 = r.left + r.width * (u.c.dir === 'l' ? 0.3 : 0.7);
      const y1 = r.top + r.height * 0.45;
      const tx = foe.c ? foe.c.x + rand(-6 - n * 10, 6 + n * 10) : foe.x;
      const ty = foe.c ? foe.c.y - foe.c.size * 0.4 : foe.y;
      u.c.face(tx < u.c.x ? 'l' : 'r');
      u.c.oneShot('strike', 300);
      if (window.__sfx) {
        if (kind === 'drop') window.__sfx.waterSplash();
        else window.__sfx.dashWhoosh(1.3);
      }
      SS.fx.lob(kind, x1, y1, tx, ty, {
        spin: kind !== 'drop',
        arc: (tm && tm.arc) || u.cls.arc || (kind === 'drop' ? 26 : 70),
        speed: (tm && tm.speed) || (kind === 'drop' ? 780 : 620),
        size: 24,
        onHit: (hx, hy) => {
          if (whiff || over) { SS.fx.dust(hx, hy, 2, [6, 10]); return; }
          const dmg = u.cls.dmg * dmgMul;
          if (splash) {
            SS.fx.impactStar(hx, hy, 56);
            if (kind === 'snowball') SS.fx.splash(hx, hy, 8); else SS.fx.dust(hx, hy, 5, [12, 26]);
            if (window.__sfx) window.__sfx.impactLite && window.__sfx.impactLite();
            enemiesOf(u).forEach(f => {
              if (Math.hypot(f.c.x - hx, f.c.y - hy) < splash + f.c.size * 0.3) applyDamage(u, f, dmg, { slow });
            });
          } else {
            /* single-target: hit whichever foe is at the landing spot */
            let victim = (foe.alive && foe.c && Math.hypot(foe.c.x - hx, foe.c.y - hy) < 70 + foe.c.size * 0.3) ? foe : null;
            if (!victim) victim = enemiesOf(u).find(f => Math.hypot(f.c.x - hx, f.c.y - hy) < 55 + f.c.size * 0.3) || null;
            if (victim) {
              if (kind === 'drop' || kind === 'snowball') SS.fx.splash(hx, hy, 6);
              SS.fx.impactStar(hx, hy, 30);
              applyDamage(u, victim, dmg, { slow });
            } else {
              SS.fx.dust(hx, hy, 2, [6, 12]);
            }
          }
        }
      });
    };
    for (let n = 0; n < count; n++) later(() => shoot(n), n * 130);
  }
  function doShot(u, foe) { fireProj(u, foe, false); }

  function doHeal(u, ally) {
    u.c.face(ally.c.x < u.c.x ? 'l' : 'r');
    if (u.cls.song) {
      u.c.oneShot('jump', 740);
      u.c.say(pick(['♪ oooOOoo ♪', '♪ arf arf arfff ♪', '♪ hmmmMMM ♪']), 1600);
      later(() => { if (ally.alive) heal(u, ally, u.cls.heal); }, 500);
    } else {
      u.c.oneShot('strike', 300);
      const r = u.c.el.getBoundingClientRect();
      SS.fx.lob('berry', r.left + r.width / 2, r.top + r.height * 0.4, ally.c.x, ally.c.y - ally.c.size * 0.5, {
        arc: 90, spin: true, speed: 540,
        onHit: () => { if (ally.alive) heal(u, ally, u.cls.heal); }
      });
    }
  }

  /* ---------------- specials ---------------- */
  function addTemp(side, spec) {
    const c = W.addCritter({ species: spec.species, size: spec.size, variant: spec.variant });
    c.place(spec.x, spec.y);
    c.face(side === 'west' ? 'r' : 'l');
    const u = makeUnit(c, side, spec.cls);
    u.temp = true;
    u.expireAt = performance.now() + (spec.lifeMs || 15000);
    units.push(u);
    return u;
  }
  const specCtx = () => ({
    units, enemiesOf, alliesOf, applyDamage, heal, later, rand, pick,
    W, fx: SS.fx, P: PRM, addTemp, over: () => over
  });

  function doSpecial(u) {
    const sp = spOf(u.side);
    const def = M.specialDef(sp, u.specialId || champs[u.side].specialId);
    u.c.say(def.name.toUpperCase() + '!!!', 2000);
    u.c.setAction('cheer');
    later(() => { if (u.alive && !u.c.el.classList.contains('act-spin')) u.c.setAction('idle'); }, 1400);
    const who = isHuman(u) ? (mode === 'duel' ? 'player ' + ctrlOf(u).hud : 'you') : (u.champName || u.c.name);
    W.warBanner(def.name.toUpperCase() + '!', 'unleashed by ' + who);
    W.flash(); W.shake();
    if (window.__sfx) { window.__sfx.taiko(1); window.__sfx.rumble && window.__sfx.rumble(); }
    if (SS.specials) SS.specials.cast(def.id, u, specCtx());
    updatePlayerHud();
  }

  /* ---------------- reinforcements & showdown ---------------- */
  function spawnWave(side) {
    const sp = spOf(side);
    const kit = KITS[sp];
    const gT = W.groundTop(), gB = W.groundBot();
    const n = Math.round(PRM.reinfN);
    for (let i = 0; i < n; i++) {
      const c = W.addCritter({ species: sp, size: sp === 'sq' ? rand(92, 116) : rand(104, 130) });
      const y = gT + 50 + (i % 3) * ((gB - gT - 70) / 2.2);
      c.place(side === 'west' ? W.vw() * 0.035 : W.vw() * 0.965, y);
      c.face(side === 'west' ? 'r' : 'l');
      c.setFace('angry', 'frown');
      const cls = kit[(i + 1) % kit.length];
      const u = makeUnit(c, side, cls);
      u.hp = u.maxHp = Math.round(cls.hp * 0.85);
      c.setHp(1);
      units.push(u);
      SS.tribes[side].push(c);
      SS.playground.wirePetting(c);
      c.oneShot('jump', 740);
      const r = c.el.getBoundingClientRect();
      SS.fx.dust(r.left + r.width / 2, r.bottom - 6, 4, [10, 22]);
      if (i === 0) c.say(pick(CRIES[sp]), 1800);
    }
    tuneUnits();
  }
  function maybeReinforce(side) {
    if (over || showdown || reinforced[side] || mode === 'duel' || PRM.reinf < 0.5) return;
    const fielded = sideUnits(side).filter(u => u.alive && !u.isChamp).length;
    if (fielded > 2) return;
    reinforced[side] = true;
    const mine = humanSides().includes(side);
    W.warBanner(mine ? 'REINFORCEMENTS!!' : 'ENEMY REINFORCEMENTS!!',
      side === 'west' ? 'more scamper down from the oak' : 'more haul out of the surf');
    if (window.__sfx) { window.__sfx.taiko(0.9); window.__sfx.chargeHorn && window.__sfx.chargeHorn(); }
    later(() => { if (!over) spawnWave(side); }, 700);
  }

  function checkShowdown() {
    if (showdown || over || mode === 'duel' || mode === 'auto' || !p1()) return;
    const foeSide = p1().side === 'west' ? 'east' : 'west';
    const foes = sideUnits(foeSide).filter(u => u.alive);
    if (foes.length !== 1 || !foes[0].isChamp) return;
    showdown = true;
    const champ = foes[0];
    heal(champ, champ, Math.round(champ.maxHp * 0.3));
    champ.cls.speed *= 1.18;
    champ.target = p1().unit;
    champ.c.say(pick(['is that ALL of you?!', 'my turn now!!', 'come here, little one!!']), 2400);
    W.warBanner('THE FINAL SHOWDOWN', 'their champion answers to your bonk alone — allies fall back', 3200);
    if (window.__sfx) { window.__sfx.startMusic('climax', { volume: 0.45 }); window.__sfx.taiko(1); }
    sideUnits(p1().side).forEach(u => {
      if (!u.alive || u === p1().unit) return;
      u.cheering = true;
      u.target = null;
      u.cheerSpot = {
        x: W.vw() * (p1().side === 'west' ? rand(0.05, 0.2) : rand(0.8, 0.95)),
        y: rand(W.groundTop() + 30, W.groundBot() - 10)
      };
    });
  }

  /* ---------------- going down ---------------- */
  function down(def, att) {
    def.alive = false;
    def.c.setBonked(true);
    if (T && att && isHuman(att)) T.ev('bonks');
    if (T && isHuman(def)) T.ev('gotBonked');
    if (window.__sfx) { window.__sfx.thunk(); if (Math.random() < 0.4) window.__sfx.fallWhistle && window.__sfx.fallWhistle(); }
    const cp = contactPoint(def);
    SS.fx.dust(cp.x, cp.y + 20, 5, [10, 26]);
    if (att && att.c && Math.random() < 0.5) att.c.say(pick(['bonk!', 'gotcha!', 'sorry!! kind of!', 'stay cozy!']), 1500);
    units.forEach(o => { if (o.target === def) o.target = null; });
    players.forEach(p => { if (p.chaseOrder === def) p.chaseOrder = null; });

    const ctrl = ctrlOf(def);
    if (ctrl && !over && mode !== 'duel') {
      const rest = sideUnits(ctrl.side).filter(x => x.alive);
      if (rest.length) {
        const next = rest.sort((a, b) => b.hp - a.hp)[0];
        later(() => {
          if (over || !next.alive) return;
          setPlayerUnit(ctrl, next);
          W.warBanner('YOU ARE NOW ' + next.c.name.toUpperCase() + '!', 'the ' + next.cls.name + ' takes up the fight');
          next.c.say("my turn!!", 1600);
        }, 700);
      }
    }
    maybeReinforce(def.side);
    checkShowdown();
    checkEnd();
  }

  function checkEnd() {
    if (over) return;
    const westAlive = sideUnits('west').some(u => u.alive);
    const eastAlive = sideUnits('east').some(u => u.alive);
    if (westAlive && eastAlive) {
      const wa = sideUnits('west').filter(u => u.alive), ea = sideUnits('east').filter(u => u.alive);
      if (!finalDuel && !showdown && mode !== 'duel' && wa.length === 1 && ea.length === 1) {
        finalDuel = true;
        W.warBanner('THE FINAL BONK', 'last two standing — everything hits harder');
        if (window.__sfx) { window.__sfx.startMusic('climax', { volume: 0.45 }); window.__sfx.taiko(1); }
      }
      return;
    }
    over = true; running = false;
    const winner = westAlive ? 'west' : 'east';
    resolveBattle(winner);
  }

  function resolveBattle(winner) {
    const durationS = battleT0 ? (performance.now() - battleT0) / 1000 : 0;
    let won = false;
    if (mode === 'duel') won = true; /* somebody human won */
    else if (mode === 'auto') won = prediction === winner;
    else won = p1() && p1().side === winner;

    later(() => {
      if (window.__sfx) window.__sfx.stopMusic();
      if (mode === 'duel') {
        const pWin = players.find(p => p.side === winner);
        W.warBanner('PLAYER ' + (pWin ? pWin.hud : '?') + ' WINS!!', (pWin ? M.custom(spOf(winner)).name : '') + ' takes the field', 3200);
        if (window.__sfx) window.__sfx.fanfare();
      } else if (mode === 'auto') {
        W.warBanner((winner === 'west' ? 'THE SQUIRRELS' : 'THE SEALS') + ' WIN!!',
          prediction ? (won ? 'your bet paid off!!' : 'so much for your bet…') : 'what a scrap', 3200);
        if (won && window.__sfx) window.__sfx.fanfare();
      } else if (won) {
        const b = T ? T.stats.bonks : 0;
        W.warBanner('VICTORY!!', b > 0 ? ('you personally bonked ' + b + (b === 1 ? ' foe' : ' foes')) : 'the field is yours… and very quiet', 3400);
        if (window.__sfx) window.__sfx.fanfare();
        sideUnits(winner).filter(u => u.alive).forEach(u => { u.c.setAction('cheer'); u.c.flashFace('happy', 'open', 3000); });
      } else {
        W.warBanner('ALL BONKED…', 'the last tail has flopped', 3000);
      }
    }, 600);

    if (T) {
      if (mode === 'duel') T.event('duel');
      if (mode === 'auto' && prediction && won) T.event('oracle');
    }
    const newly = T ? T.finish({ won: mode === 'duel' ? !!winner && players.some(p => p.side === winner) : won, durationS }) : [];

    later(() => {
      if (mode === 'story') {
        finishStory(won, newly);
      } else {
        showPost(winner, won, durationS, newly);
      }
    }, 3400);
  }

  function finishStory(won, newly) {
    const side = p1() ? p1().side : 'west';
    softenHud();
    if (won) {
      endToFinale(true, side);
    } else {
      W.showMsg('ALL BONKED…', 'the ' + (side === 'west' ? 'squirrels' : 'seals') + ' have fallen — but stories can bend');
      W.showChoices([
        { label: '⟲ Try the fight again', small: 'same armies, fresh hearts (' + M.difficulty() + ')', fn: () => { W.hideMsg(); BT.rematch(); } },
        { label: '▸ Let the story continue', small: 'defeat is a chapter too', fn: () => { W.hideMsg(); endToFinale(false, side); } }
      ]);
    }
  }

  function endToFinale(playerWon, side) {
    BT.teardown({ keepBonked: true });
    SS.finale.start({ playerWon, playerSide: side });
  }

  /* ---------------- post-battle overlay (quick/duel/auto) ---------------- */
  function showPost(winner, won, durationS, newly) {
    softenHud();
    const title = document.getElementById('po-title');
    const sub = document.getElementById('po-sub');
    if (mode === 'duel') {
      const pWin = players.find(p => p.side === winner);
      title.textContent = 'PLAYER ' + (pWin ? pWin.hud : '?') + ' WINS!';
      sub.textContent = M.custom(spOf(winner)).name + ' stands tall · rematch?';
    } else if (mode === 'auto') {
      title.textContent = (winner === 'west' ? 'SQUIRRELS' : 'SEALS') + ' WIN!';
      sub.textContent = prediction ? (won ? 'the oracle was right — challenge complete territory' : 'your side got flattened') : 'nature is beautiful';
    } else {
      title.textContent = won ? 'VICTORY!!' : 'ALL BONKED…';
      sub.textContent = won ? 'the ' + (winner === 'west' ? 'meadow' : 'shore') + ' sings your name' : 'try again — tweak the odds in settings if you like';
    }
    const s = T ? T.stats : { bonks: 0, crits: 0, snacks: 0, specials: 0 };
    const mins = Math.floor(durationS / 60), secs = Math.round(durationS % 60);
    const tstr = (mins ? mins + 'm ' : '') + secs + 's';
    document.getElementById('po-stats').innerHTML = mode === 'auto'
      ? `<div class="po-stat"><b>${tstr}</b><span>BATTLE TIME</span></div>
         <div class="po-stat"><b>${prediction ? (won ? '✓' : '✗') : '—'}</b><span>YOUR BET</span></div>`
      : `<div class="po-stat"><b>${s.bonks}</b><span>YOUR BONKS</span></div>
         <div class="po-stat"><b>${s.crits}</b><span>CRITS</span></div>
         <div class="po-stat"><b>${s.specials}</b><span>SPECIALS</span></div>
         <div class="po-stat"><b>${s.snacks}</b><span>SNACKS</span></div>
         <div class="po-stat"><b>${tstr}</b><span>TIME</span></div>`;
    document.getElementById('po-unlocks').innerHTML = (newly || []).map(ch =>
      `<span class="po-unlock">✶ ${ch.name} — ${M.rewardText(ch.id)}</span>`).join('');
    const btns = document.getElementById('po-btns');
    btns.innerHTML = '';
    const mk = (label, small, fn, primary) => {
      const b = document.createElement('button');
      b.className = 'choice-btn';
      if (primary) { b.style.background = 'var(--ink)'; b.style.color = 'var(--paper)'; }
      b.innerHTML = label + (small ? `<small>${small}</small>` : '');
      b.addEventListener('click', fn);
      btns.appendChild(b);
    };
    mk(mode === 'auto' ? '⟲ Run it back' : (mode === 'duel' ? '⟲ Rematch' : (won ? '⟲ Once more' : '⟲ Try again')),
      mode === 'auto' ? 'same armies' : 'same champion, fresh hearts', () => { hidePost(); BT.rematch(); }, !won && mode !== 'auto');
    mk('⇄ ' + (mode === 'auto' ? 'New bets' : 'Change champion'), 'back to the pick', () => { hidePost(); BT.repick(); });
    mk('⚑ Menu', 'modes, studio, settings', () => { hidePost(); SS.game.toMenu(); });
    document.getElementById('post-overlay').classList.add('on');
  }
  function hidePost() { document.getElementById('post-overlay').classList.remove('on'); }

  /* ---------------- HUD ---------------- */
  function softenHud() {
    ['controls-hint', 'touch-actions', 'auto-hud', 'duel-hint'].forEach(id => document.getElementById(id).classList.remove('on'));
  }
  function updateTeamHud() {
    ['west', 'east'].forEach(side => {
      const us = sideUnits(side);
      const tot = us.reduce((a, u) => a + u.maxHp, 0) || 1;
      const cur = us.reduce((a, u) => a + Math.max(0, u.hp), 0);
      document.getElementById(side === 'west' ? 'thp-west' : 'thp-east').style.width = (cur / tot * 100) + '%';
    });
  }
  function updatePlayerHud() {
    players.forEach(p => {
      const u = p.unit;
      if (!u) return;
      const sfx = p.hud === 2 ? '-p2' : '';
      const hpf = Math.max(0, u.hp / u.maxHp);
      document.getElementById('ph-hp' + sfx).style.width = (hpf * 100) + '%';
      document.getElementById('ph-hp-num' + sfx).textContent = Math.max(0, Math.round(u.hp)) + ' / ' + u.maxHp;
      const mpf = mp[p.side] / MP_MAX;
      document.getElementById('ph-mp' + sfx).style.width = (mpf * 100) + '%';
      document.getElementById('ph-mp-num' + sfx).textContent = Math.round(mp[p.side]) + ' / ' + MP_MAX;
      document.getElementById('ph-ready' + sfx).classList.toggle('on', mpf >= 1);
    });
    if (p1()) document.getElementById('ta-sp').classList.toggle('ready', mp[p1().side] >= MP_MAX);
  }

  /* ---------------- the loop ---------------- */
  function loop(ts) {
    if (!running || over) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.04, (ts - lastTs) / 1000) * tscale;
    lastTs = ts;
    const now = performance.now();

    units.forEach(u => {
      try {
      if (!u.alive) return;
      /* temp units time out and wander off */
      if (u.temp && now > u.expireAt) {
        u.alive = false;
        u.c.el.style.transition = 'opacity .5s ease';
        u.c.el.style.opacity = '0';
        const cc = u.c;
        setTimeout(() => W.removeCritter(cc), 520);
        units.forEach(o => { if (o.target === u) o.target = null; });
        return;
      }
      u.cd = Math.max(0, u.cd - dt);
      let vx = 0, vy = 0;
      const slowed = now < u.slowUntil ? 0.55 : 1;
      const stunned = now < u.stunUntil;
      const ctrl = ctrlOf(u);

      if (stunned) {
        /* wobble in place */
      } else if (ctrl) {
        let sp = u.cls.speed * slowed * (now < ctrl.dashUntil ? 2.2 : 1);
        if (ctrl.keys.up) vy -= 1; if (ctrl.keys.down) vy += 1;
        if (ctrl.keys.left) vx -= 1; if (ctrl.keys.right) vx += 1;
        if (vx || vy) {
          const m = Math.hypot(vx, vy);
          vx = vx / m * sp; vy = vy / m * sp;
        } else if (ctrl.chaseOrder && ctrl.chaseOrder.alive) {
          const d = dist(u, ctrl.chaseOrder);
          const rng = ((u.cls.meleeRange || u.cls.range) * u.c.scale) * 0.9;
          if (d > rng) {
            vx = (ctrl.chaseOrder.c.x - u.c.x) / d * sp;
            vy = (ctrl.chaseOrder.c.y - u.c.y) / d * sp;
          } else if (u.cd <= 0) {
            doMelee(u, ctrl.chaseOrder); u.cd = u.cls.cd * (u.cdMul || 1);
          }
        } else if (ctrl.moveOrder) {
          const d = Math.hypot(ctrl.moveOrder.x - u.c.x, ctrl.moveOrder.y - u.c.y);
          if (d > 14) { vx = (ctrl.moveOrder.x - u.c.x) / d * sp; vy = (ctrl.moveOrder.y - u.c.y) / d * sp; }
          else ctrl.moveOrder = null;
        }
        const f = W.nearestFood(null, u.c.x, u.c.y, 42);
        if (f) {
          W.takeFood(f);
          heal(u, u, Math.round(u.maxHp * PRM.snackHeal));
          u.c.flashFace('happy', 'open', 900);
          if (T) T.ev('snacks');
          if (window.__sfx) window.__sfx.pop();
        }
      } else {
        aiThink(u, now, dt);
        if (u._vx || u._vy) { vx = u._vx * slowed; vy = u._vy * slowed; }
      }

      u.kbx *= Math.pow(0.0008, dt); u.kby *= Math.pow(0.0008, dt);
      if (Math.abs(u.kbx) < 2) u.kbx = 0;
      if (Math.abs(u.kby) < 2) u.kby = 0;

      let nx = u.c.x + (vx + u.kbx) * dt;
      let ny = u.c.y + (vy + u.kby) * dt;
      nx = Math.max(W.vw() * 0.02 + 30, Math.min(W.vw() * 0.98 - 30, nx));
      ny = Math.max(W.groundTop() + 8, Math.min(W.groundBot(), ny));
      if (nx !== u.c.x || ny !== u.c.y) {
        if (Math.abs(vx) > 1) u.c.face(vx < 0 ? 'l' : 'r');
        u.c.setPos(nx, ny);
      }
      const moving = Math.hypot(vx, vy) > 22;
      const dashing = ctrl && now < ctrl.dashUntil;
      if (!u.striking && !u.c.el.classList.contains('act-hurt') && !u.c.el.classList.contains('act-spin')) {
        const want = dashing ? 'act-dash' : moving ? 'act-walk' : null;
        const has = u.c.el.classList.contains('act-dash') ? 'act-dash' : u.c.el.classList.contains('act-walk') ? 'act-walk' : null;
        if (want !== has) {
          u.c.el.classList.remove('act-walk', 'act-dash');
          if (want) u.c.el.classList.add(want);
        }
      }
      } catch (e) { console.error('unit-tick', u && u.c && u.c.name, e); }
    });

    /* separation */
    for (let i = 0; i < units.length; i++) {
      const a = units[i]; if (!a.alive) continue;
      for (let j = i + 1; j < units.length; j++) {
        const b = units[j]; if (!b.alive) continue;
        const d = dist(a, b), min = (a.c.size + b.c.size) * 0.31;
        if (d < min && d > 0.01) {
          const push = (min - d) * 0.55;
          const px = (b.c.x - a.c.x) / d * push, py = (b.c.y - a.c.y) / d * push;
          a.c.setPos(a.c.x - px, a.c.y - py * 0.7);
          b.c.setPos(b.c.x + px, b.c.y + py * 0.7);
        }
      }
    }

    /* AI-side specials */
    ['west', 'east'].forEach(side => {
      try {
      if (players.some(p => p.side === side)) return;
      if (mp[side] >= MP_MAX && now - lastAISpec[side] > PRM.eSpecial * 1000 / (mode === 'auto' ? tscale : 1)) {
        const champ = champs[side];
        if (champ && champ.alive) { mp[side] = 0; lastAISpec[side] = now; doSpecial(champ); }
        else mp[side] = 0;
      }
      } catch (e) { console.error('ai-special', e); }
    });

    rafId = requestAnimationFrame(loop);
  }

  /* ---------------- AI brains ---------------- */
  function aiThink(u, now, dt) {
    if (now < u.thinkAt) return;
    u.thinkAt = now + rand(140, 260) / (mode === 'auto' ? tscale : 1);
    u._vx = 0; u._vy = 0;
    const hero = p1() && p1().unit && p1().unit.alive ? p1().unit : null;

    if (u.cheering) {
      if (u.cls.healer && hero && hero.hp < hero.maxHp * 0.85) {
        const d = Math.max(1, dist(u, hero));
        if (d > u.cls.range * 0.9) {
          u._vx = (hero.c.x - u.c.x) / d * u.cls.speed;
          u._vy = (hero.c.y - u.c.y) / d * u.cls.speed;
        } else if (u.cd <= 0) { doHeal(u, hero); u.cd = u.cls.cd; }
        return;
      }
      const s = u.cheerSpot || { x: u.c.x, y: u.c.y };
      const d = Math.hypot(s.x - u.c.x, s.y - u.c.y);
      if (d > 40) {
        u._vx = (s.x - u.c.x) / d * u.cls.speed * 0.9;
        u._vy = (s.y - u.c.y) / d * u.cls.speed * 0.9;
      } else if (Math.random() < 0.25) {
        u.c.setAction('cheer');
        const uu = u;
        later(() => { if (uu.alive) uu.c.setAction('idle'); }, 1100);
        if (Math.random() < 0.3) uu.c.say(pick(['go go GO!!', 'BONK!! BONK!!', 'you got this!!', 'for all of us!!']), 1400);
      }
      return;
    }

    if (u.cls.healer) {
      const hurt = alliesOf(u).filter(a => a.hp < a.maxHp * 0.8).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        const d = dist(u, hurt);
        if (d > u.cls.range * 0.9) {
          u._vx = (hurt.c.x - u.c.x) / d * u.cls.speed;
          u._vy = (hurt.c.y - u.c.y) / d * u.cls.speed;
        } else if (u.cd <= 0) { doHeal(u, hurt); u.cd = u.cls.cd; }
        return;
      }
      const anchor = alliesOf(u)[0];
      if (anchor && dist(u, anchor) > 200) {
        const d = dist(u, anchor);
        u._vx = (anchor.c.x - u.c.x) / d * u.cls.speed * 0.7;
        u._vy = (anchor.c.y - u.c.y) / d * u.cls.speed * 0.7;
      }
      return;
    }

    const huntsHero = hero && !humanSides().includes(u.side);
    if (showdown && u.isChamp && huntsHero) u.target = hero;
    if (!u.target || !u.target.alive || Math.random() < 0.06) {
      const foes = enemiesOf(u);
      if (!foes.length) return;
      if (u.isChamp && huntsHero && Math.random() < Math.min(1, 0.25 + PRM.eAggro)) u.target = hero;
      else if (huntsHero && Math.random() < PRM.eAggro * 0.75) u.target = hero;
      else {
        const scored = foes.map(f => {
          const crowd = units.filter(o => o.alive && o !== u && o.side === u.side && o.target === f).length;
          return { f, s: dist(u, f) + crowd * 110 };
        }).sort((a, b) => a.s - b.s);
        u.target = (Math.random() < 0.6 ? scored[0] : pick(scored)).f;
      }
    }
    const t = u.target;
    if (!t) return;
    const d = dist(u, t);
    const isMelee = u.cls.melee;
    const rng = isMelee ? ((u.cls.meleeRange || u.cls.range) * u.c.scale) : u.cls.range;

    if (isMelee) {
      if (d > rng * 0.85) {
        const tx = t.c.x + u.flankX, ty = t.c.y + u.flankY;
        const dd = Math.max(1, Math.hypot(tx - u.c.x, ty - u.c.y));
        u._vx = (tx - u.c.x) / dd * u.cls.speed;
        u._vy = (ty - u.c.y) / dd * u.cls.speed;
      } else if (u.cd <= 0) { doMelee(u, t); u.cd = u.cls.cd; }
    } else {
      if (d > rng * 0.9) {
        const tx = t.c.x + u.flankX * 1.6, ty = t.c.y + u.flankY * 1.4;
        const dd = Math.max(1, Math.hypot(tx - u.c.x, ty - u.c.y));
        u._vx = (tx - u.c.x) / dd * u.cls.speed;
        u._vy = (ty - u.c.y) / dd * u.cls.speed;
      } else if (d < rng * 0.4) {
        u._vx = -(t.c.x - u.c.x) / d * u.cls.speed * 0.8;
        u._vy = -(t.c.y - u.c.y) / d * u.cls.speed * 0.4 + rand(-30, 30);
      } else if (u.cd <= 0) { doShot(u, t); u.cd = u.cls.cd; }
    }
    if (u.isChamp && d > rng * 1.1 && d < u.cls.range && u.cd <= 0) {
      doShot(u, t); u.cd = (u.cls.cdR || 0.8) * ((u.throwMod && u.throwMod.cdMul) || 1);
    }
    if (u.hp < u.maxHp * 0.45) {
      const f = W.nearestFood(null, u.c.x, u.c.y, 60);
      if (f) { W.takeFood(f); heal(u, u, Math.round(u.maxHp * PRM.snackHeal)); }
    }
  }

  /* ---------------- lifecycle ---------------- */
  function resetState() {
    over = false; running = false; finalDuel = false; showdown = false;
    battleT0 = 0; lastAISpec = { west: 0, east: 0 };
    reinforced = { west: false, east: false };
    mp = { west: 0, east: 0 };
    tscale = 1;
    players = [];
    T = null;
    PRM = M.effective();
  }

  function startInternal(opts) {
    ensureDom();
    resetState();
    clearAll();
    mode = opts.mode || 'story';
    lastOpts = opts;
    W.state = 'battle';
    W._skipHandler = BT.skip;
    arrangeRanks();
    wireInput();
    if (opts.skipPick && opts.side !== undefined) {
      later(() => beginBattle(opts.side), 900);
    } else if (opts.skipPick && mode === 'auto') {
      later(() => beginBattle(null), 900);
    } else {
      later(showPick, mode === 'story' ? 0 : 700);
    }
  }

  BT.start = (opts = {}) => {
    opts.mode = opts.mode || 'story';
    if (opts.mode === 'story') {
      if (W.state === 'battle') return;
      ensureDom();
      resetState();
      clearAll();
      mode = 'story';
      lastOpts = opts;
      W.state = 'battle';
      W._skipHandler = BT.skip;
      W.stopSpeech();
      if (window.__sfx) window.__sfx.stopMusic();
      W.curtainTransition({
        num: 'CHAPTER THREE', name: 'The Great Bonk',
        sub: 'no biting · no scratching · bonking only',
        holdMs: 3600,
        narration: 'The wall was gone, and something had to fill the space it left. The squirrels chose pride. The seals chose pride too. It was, both sides agreed later, a very silly thing to agree on.',
        onMid: () => {
          W.setMood('war');
          W.banner('Chapter III · The Great Bonk', 'last critter standing · ' + M.difficulty() + ' difficulty');
          W.clearFood();
          arrangeRanks();
          wireInput();
        },
        onUp: () => {
          W.narrate('But this time — the fight is YOURS to steer. Choose your champion.', 'narrator', null);
          showPick();
        }
      });
    } else {
      startInternal(opts);
    }
  };

  /* remove champions/temps, un-bonk the tribes, clear hud & input */
  BT.teardown = (o = {}) => {
    running = false; over = true;
    if (rafId) cancelAnimationFrame(rafId);
    clearAll();
    unwireInput();
    closePick();
    hidePost();
    document.body.classList.remove('battle-on', 'duel-on');
    ['team-hud', 'controls-hint', 'touch-actions', 'auto-hud', 'duel-hint'].forEach(id => {
      const el = document.getElementById(id); if (el) el.classList.remove('on');
    });
    const h1 = document.getElementById('player-hud'), h2 = document.getElementById('player-hud-2');
    if (h1) h1.classList.remove('on');
    if (h2) h2.classList.remove('on');
    units.forEach(u => {
      if (!u.c.el.isConnected) return;
      u.c.el.classList.remove('in-battle', 'is-player', 'act-spin');
      if (u.temp || u.isChamp) {
        if (u.isChamp && o.keepChamps) {
          if (!u.alive && !o.keepBonked) { u.c.setBonked(false); u.c.setHp(1); }
        } else if (o.keepBonked && u.isChamp) {
          /* story hand-off: champions stay on the field for the finale */
        } else {
          W.removeCritter(u.c);
        }
      } else {
        if (!o.keepBonked && !u.alive) { u.c.setBonked(false); u.c.setHp(1); }
        if (u.alive || !o.keepBonked) u.c.setAction('idle');
        u.c._crewed = false;
      }
    });
    units = [];
    champs = { west: null, east: null };
    players = [];
  };

  BT.rematch = () => {
    const opts = Object.assign({}, lastOpts, { skipPick: true, side: pickSides.p1 || (lastOpts && lastOpts.side) });
    if (mode === 'quick' || mode === 'story') opts.side = lastSideFor1p !== null ? lastSideFor1p : opts.side;
    BT.teardown();
    if (mode === 'auto') opts.side = undefined;
    startInternal(Object.assign(opts, { mode }));
  };
  BT.repick = () => {
    BT.teardown();
    startInternal(Object.assign({}, lastOpts, { mode, skipPick: false }));
  };
  let lastSideFor1p = null;
  const origBegin = beginBattle;
  beginBattle = function (side) {
    if (mode === 'quick' || mode === 'story') lastSideFor1p = side;
    if (mode === 'duel') pickSides.p1 = side;
    origBegin(side);
  };

  /* fast-forward — story continues; quick modes go to the post screen */
  BT.skip = () => {
    if (W.state !== 'battle') return;
    const overlay = document.getElementById('pick-overlay');
    if (overlay.classList.contains('on')) overlay.classList.remove('on');
    if (mode !== 'auto' && players.length === 0) players = [makeController('west', 1)];
    over = true; running = false;
    if (rafId) cancelAnimationFrame(rafId);
    const westHp = sideUnits('west').reduce((a, u) => a + Math.max(0, u.hp), 0);
    const eastHp = sideUnits('east').reduce((a, u) => a + Math.max(0, u.hp), 0);
    const loser = westHp >= eastHp ? 'east' : 'west';
    sideUnits(loser).forEach(u => { if (u.alive) { u.alive = false; u.c.setBonked(true); } });
    resolveBattle(loser === 'west' ? 'east' : 'west');
  };
})();
