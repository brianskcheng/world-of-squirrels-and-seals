/* =====================================================================
   META — saved progression, unlockable skills, challenges, customization
   and every balance parameter, persisted to localStorage.
   window.SIM.meta
   ===================================================================== */
window.SIM = window.SIM || {};
(function () {
  const M = {};
  SIM.meta = M;
  const KEY = 'sim-meta-v1';

  /* ================= SKILL CATALOG ================= */
  /* specials (ults) — unlock: {type:'start'} | {type:'plays', n} | {type:'challenge', id} */
  M.SPECIALS = {
    left: [
      { id: 'airstrike', name: 'Paper Airstrike',   desc: 'paper jets sweep the field — every foe takes a hit',           unlock: { type: 'start' } },
      { id: 'scatter',   name: 'Scatter Grenades',  desc: 'grenades burst in a wide arc, splashing nearby foes',          unlock: { type: 'plays', n: 2 } },
      { id: 'blitz',     name: 'Bayonet Blitz',     desc: 'charge the line — close foes are skewered and knocked back',   unlock: { type: 'plays', n: 4 } },
      { id: 'vanguard',  name: 'Iron Vanguard',     desc: 'a shield aura wraps your whole team against harm',             unlock: { type: 'challenge', id: 'bonk5' } },
      { id: 'medevac',   name: 'Medevac Drop',      desc: 'a supply drop heals every friendly smiley on the field',       unlock: { type: 'challenge', id: 'crit3' } }
    ],
    right: [
      { id: 'dragon',    name: 'Spirit Dragon',     desc: 'a spectral dragon sweeps the field, bonking every foe',        unlock: { type: 'start' } },
      { id: 'thunder',   name: 'Judgement Thunder', desc: 'lightning strikes from above — heavy damage in a wide zone',   unlock: { type: 'plays', n: 2 } },
      { id: 'quake',     name: 'Seismic Slam',      desc: 'the ground erupts — nearby foes are stunned and launched',     unlock: { type: 'plays', n: 4 } },
      { id: 'frostwave', name: 'Frost Wave',        desc: 'a freezing wave rolls out, slowing every foe it touches',      unlock: { type: 'challenge', id: 'bonk5' } },
      { id: 'mending',   name: 'Mending Rain',      desc: 'gentle rain mends every friendly heart on the field',         unlock: { type: 'challenge', id: 'crit3' } }
    ]
  };
  /* basic throws */
  M.THROWS = {
    left: [
      { id: 'burst',  name: 'Burst Fire',    desc: 'rapid bullets — quick & dependable',                    unlock: { type: 'start' } },
      { id: 'sniper', name: 'Sniper Shot',   desc: 'one long piercing shot down the lane',                  unlock: { type: 'plays', n: 3 } },
      { id: 'rocket', name: 'Splash Rocket', desc: 'a rocket that splashes on impact',                      unlock: { type: 'challenge', id: 'snacker' } }
    ],
    right: [
      { id: 'orb',   name: 'Magic Orb',      desc: 'quick & dependable arcane bolt',                        unlock: { type: 'start' } },
      { id: 'frost', name: 'Frost Bolt',     desc: 'chills whoever it hits — they slow down',               unlock: { type: 'plays', n: 3 } },
      { id: 'flame', name: 'Flame Bolt',     desc: 'a burning bolt that scorches on impact',                unlock: { type: 'challenge', id: 'snacker' } }
    ]
  };
  /* accessories — slot: hat | neck | face */
  M.ACCS = [
    { id: 'leafcap',   name: 'Leaf Beret',     slot: 'hat',  unlock: { type: 'start' } },
    { id: 'crown',     name: 'Tiny Crown',     slot: 'hat',  unlock: { type: 'challenge', id: 'untouch' } },
    { id: 'tophat',    name: 'Top Hat',        slot: 'hat',  unlock: { type: 'challenge', id: 'duelist' } },
    { id: 'flower',    name: 'Ear Flower',     slot: 'hat',  unlock: { type: 'challenge', id: 'bothsides' } },
    { id: 'scarf',     name: 'Cozy Scarf',     slot: 'neck', unlock: { type: 'start' } },
    { id: 'bandana',   name: 'Bandana',        slot: 'neck', unlock: { type: 'challenge', id: 'speedy' } },
    { id: 'cape',      name: 'Hero Cape',      slot: 'neck', unlock: { type: 'challenge', id: 'hardwin' } },
    { id: 'shellneck', name: 'Shell Beads',    slot: 'neck', unlock: { type: 'challenge', id: 'veteran' } },
    { id: 'goggles',   name: 'Goggles',        slot: 'face', unlock: { type: 'challenge', id: 'specialist' } },
    { id: 'monocle',   name: 'Monocle',        slot: 'face', unlock: { type: 'challenge', id: 'oracle' } },
    { id: 'eyepatch',  name: 'Eye Patch',      slot: 'face', unlock: { type: 'plays', n: 5 } }
  ];
  /* smiley face presets */
  M.FACES = [
    { id: 'happy',     name: 'Happy' },
    { id: 'grin',      name: 'Grin' },
    { id: 'wink',      name: 'Wink' },
    { id: 'surprised', name: 'Surprised' },
    { id: 'smug',      name: 'Smug' },
    { id: 'laugh',     name: 'Laugh' },
    { id: 'cool',      name: 'Cool' },
    { id: 'tongue',    name: 'Tongue' },
    { id: 'meh',       name: 'Meh' },
    { id: 'sleepy',    name: 'Sleepy' },
    { id: 'shy',       name: 'Shy' },
    { id: 'angry',     name: 'Angry' }
  ];

  /* ================= CHALLENGES ================= */
  /* scope: 'battle' (live stat), 'end' (checked at battle end), 'total', 'event' */
  M.CHALLENGES = [
    { id: 'firstbonk',  icon: '✶', name: 'First Bonk',       desc: 'bonk a foe yourself, in any battle',            scope: 'battle', stat: 'bonks',    n: 1 },
    { id: 'bonk5',      icon: '✶', name: 'Bonk Machine',     desc: 'bonk 5 foes yourself in a single battle',       scope: 'battle', stat: 'bonks',    n: 5 },
    { id: 'crit3',      icon: '✦', name: 'Lucky Smiley',     desc: 'land 3 BONK! crits in one battle',              scope: 'battle', stat: 'crits',    n: 3 },
    { id: 'snacker',    icon: '♥', name: 'Battle Snacker',   desc: 'eat 3 snacks during one battle',                scope: 'battle', stat: 'snacks',   n: 3 },
    { id: 'specialist', icon: '✧', name: 'Special Delivery', desc: 'unleash your special 3 times in one battle',    scope: 'battle', stat: 'specials', n: 3 },
    { id: 'untouch',    icon: '◎', name: 'Untouchable',      desc: 'win a battle without your champion getting bonked', scope: 'end',
      test: (res, s, info) => res.won && s.gotBonked === 0 && (info.mode === 'quick' || info.mode === 'story') },
    { id: 'speedy',     icon: '〰', name: 'Lightning Bonk',   desc: 'win any fight in under 90 seconds',             scope: 'end',
      test: (res, s, info) => res.won && res.durationS <= 90 && info.mode !== 'auto' },
    { id: 'hardwin',    icon: '▲', name: 'The Hard Way',     desc: 'win a battle on hard difficulty',               scope: 'end',
      test: (res, s, info) => res.won && info.difficulty === 'hard' && info.mode !== 'auto' && info.mode !== 'duel' },
    { id: 'bothsides',  icon: '☾', name: 'Both Sides Now',   desc: 'win once as the west AND once as the east',     scope: 'end',
      test: (res, s, info, D) => D.winsLeft >= 1 && D.winsRight >= 1 },
    { id: 'oracle',     icon: '★', name: 'The Oracle',       desc: 'predict the winner of an auto-battle',          scope: 'event', ev: 'oracle' },
    { id: 'duelist',    icon: '⚑', name: 'Duelist',          desc: 'finish a two-player duel (either side may win)', scope: 'event', ev: 'duel' },
    { id: 'veteran',    icon: '✿', name: 'Regular',          desc: 'win 5 battles, any mode',                       scope: 'total',
      total: (D) => D.wins >= 5 }
  ];

  /* ================= BALANCE PARAMS ================= */
  /* fmt: x = multiplier, s = seconds, % = fraction, int = whole number */
  M.PARAM_DEFS = [
    { key: 'pHp',      label: 'heart (max HP)',            min: 0.4,  max: 3,   step: 0.05, def: 1,    fmt: 'x',   group: 'Your champion' },
    { key: 'pDmg',     label: 'bonk power',                min: 0.4,  max: 3,   step: 0.05, def: 1,    fmt: 'x',   group: 'Your champion' },
    { key: 'pSpd',     label: 'move speed',                min: 0.5,  max: 2,   step: 0.05, def: 1,    fmt: 'x',   group: 'Your champion' },
    { key: 'pCd',      label: 'attack cooldown',           min: 0.3,  max: 2,   step: 0.05, def: 1,    fmt: 'x',   group: 'Your champion' },
    { key: 'dashCd',   label: 'dash cooldown',             min: 0.3,  max: 3,   step: 0.1,  def: 1.2,  fmt: 's',   group: 'Your champion' },
    { key: 'eHp',      label: 'enemy heart',               min: 0.4,  max: 2.5, step: 0.05, def: 1,    fmt: 'x',   group: 'Enemy side' },
    { key: 'eDmg',     label: 'enemy bonk power',          min: 0.4,  max: 2.5, step: 0.05, def: 1,    fmt: 'x',   group: 'Enemy side' },
    { key: 'eSpecial', label: 'enemy special every',       min: 5,    max: 30,  step: 1,    def: 14,   fmt: 's',   group: 'Enemy side' },
    { key: 'units',    label: 'fighters per side',         min: 2,    max: 9,   step: 1,    def: 6,    fmt: 'int', group: 'Armies & field' },
    { key: 'reinf',    label: 'reinforcements (0 = off)',  min: 0,    max: 1,   step: 1,    def: 1,    fmt: 'int', group: 'Armies & field' },
    { key: 'reinfN',   label: 'reinforcement size',        min: 1,    max: 5,   step: 1,    def: 3,    fmt: 'int', group: 'Armies & field' },
    { key: 'snackEvery', label: 'snacks wash in every',    min: 3,    max: 15,  step: 0.5,  def: 6.5,  fmt: 's',   group: 'Armies & field' },
    { key: 'snackHeal',  label: 'snack heal',              min: 0,    max: 0.5, step: 0.02, def: 0.2,  fmt: '%',   group: 'Armies & field' },
    { key: 'crit',     label: 'crit chance',               min: 0,    max: 0.5, step: 0.01, def: 0.12, fmt: '%',   group: 'Combat feel' },
    { key: 'critX',    label: 'crit damage',               min: 1,    max: 3,   step: 0.05, def: 1.7,  fmt: 'x',   group: 'Combat feel' },
    { key: 'kb',       label: 'knockback',                 min: 0,    max: 2.5, step: 0.05, def: 1,    fmt: 'x',   group: 'Combat feel' },
    { key: 'specialX', label: 'special damage',            min: 0.3,  max: 3,   step: 0.05, def: 1,    fmt: 'x',   group: 'Combat feel' },
    { key: 'mpGain',   label: 'spirit (special) charge',   min: 0.3,  max: 3,   step: 0.05, def: 1,    fmt: 'x',   group: 'Combat feel' },
    { key: 'duelHp',   label: 'duel mode heart',           min: 0.6,  max: 2.5, step: 0.05, def: 1.3,  fmt: 'x',   group: 'Combat feel' },
    { key: 'hpMult',   label: 'battle HP scale',           min: 1,    max: 10,  step: 0.1,  def: 4.8,  fmt: 'x',   group: 'Combat feel' },
    { key: 'dmgMult',  label: 'battle damage scale',       min: 0.2,  max: 2,   step: 0.05, def: 0.85, fmt: 'x',   group: 'Combat feel' }
  ];
  M.DIFFS = {
    easy:   { label: 'easy',   sub: 'a friendly scuffle', f: { eHp: 0.8, eDmg: 0.6, pHp: 1.25, pDmg: 1.3, eSpecial: 1.7 } },
    normal: { label: 'normal', sub: 'a fair fight',       f: {} },
    hard:   { label: 'hard',   sub: 'they mean it',       f: { eHp: 1.3, eDmg: 1.45, pHp: 0.9, pDmg: 0.85, eSpecial: 0.55 } }
  };

  /* ================= PERSISTENCE ================= */
  function freshCustom(side) {
    return side === 'left'
      ? { name: 'Sarge Sunny',   face: 'cool', size: 148, hat: 'none', neck: 'scarf', faceAcc: 'none', upHp: 0, upDmg: 0, upSpd: 0, special: 'airstrike', throw: 'burst' }
      : { name: 'Archmage Beam', face: 'smug', size: 164, hat: 'none', neck: 'none',  faceAcc: 'none', upHp: 0, upDmg: 0, upSpd: 0, special: 'dragon',    throw: 'orb' };
  }
  function fresh() {
    return {
      plays: 0, wins: 0, winsLeft: 0, winsRight: 0, smiles: 0,
      done: {}, best: {}, unlockAll: false,
      params: {}, difficulty: 'normal',
      custom: { left: freshCustom('left'), right: freshCustom('right') }
    };
  }
  let D = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw);
      D = Object.assign(fresh(), j);
      D.custom = { left: Object.assign(freshCustom('left'), (j.custom || {}).left || {}), right: Object.assign(freshCustom('right'), (j.custom || {}).right || {}) };
      D.params = j.params || {}; D.done = j.done || {}; D.best = j.best || {};
    }
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  M.save = save;
  M.data = () => D;

  /* ================= UNLOCK LOGIC ================= */
  function unlocked(u) {
    if (D.unlockAll) return true;
    if (!u || u.type === 'start') return true;
    if (u.type === 'plays') return D.plays >= u.n;
    if (u.type === 'challenge') return !!D.done[u.id];
    return false;
  }
  M.unlocked = unlocked;
  M.unlockHint = (u) => {
    if (!u || u.type === 'start') return '';
    if (u.type === 'plays') return `play ${u.n} battles · ${Math.min(D.plays, u.n)}/${u.n}`;
    if (u.type === 'challenge') {
      const ch = M.CHALLENGES.find(c => c.id === u.id);
      return 'challenge: ' + (ch ? ch.name : u.id);
    }
    return '';
  };
  M.specialDef = (side, id) => M.SPECIALS[side].find(s => s.id === id) || M.SPECIALS[side][0];
  M.throwDef = (side, id) => M.THROWS[side].find(s => s.id === id) || M.THROWS[side][0];
  M.accDef = (id) => M.ACCS.find(a => a.id === id) || null;
  M.faceDef = (id) => M.FACES.find(f => f.id === id) || M.FACES[0];
  /* what a given challenge unlocks (for reward text) */
  M.rewardText = (chId) => {
    const bits = [];
    ['left', 'right'].forEach(side => M.SPECIALS[side].concat(M.THROWS[side]).forEach(s => {
      if (s.unlock.type === 'challenge' && s.unlock.id === chId) bits.push(s.name);
    }));
    M.ACCS.forEach(a => { if (a.unlock.type === 'challenge' && a.unlock.id === chId) bits.push(a.name); });
    bits.push('+1 smile');
    return bits.join(' · ');
  };

  /* ================= CUSTOMIZATION ================= */
  M.custom = (side) => {
    if (side !== 'left' && side !== 'right') side = 'left';
    if (!D.custom[side]) side = 'left';
    const c = D.custom[side];
    /* validate selections against current unlocks */
    if (!unlocked(M.specialDef(side, c.special).unlock)) c.special = M.SPECIALS[side][0].id;
    if (!unlocked(M.throwDef(side, c.throw).unlock)) c.throw = M.THROWS[side][0].id;
    ['hat', 'neck', 'faceAcc'].forEach(slot => {
      const id = c[slot];
      if (id !== 'none') { const a = M.accDef(id); if (!a || !unlocked(a.unlock)) c[slot] = 'none'; }
    });
    return c;
  };
  M.setCustom = (side, patch) => { Object.assign(D.custom[side], patch); save(); };
  M.outfitOf = (side) => { const c = M.custom(side); return { hat: c.hat, neck: c.neck, face: c.faceAcc }; };
  /* upgrades: cost 1 smile per level */
  M.UPS = [
    { key: 'upHp',  name: 'heart',  max: 3, per: 0.10 },
    { key: 'upDmg', name: 'power',  max: 3, per: 0.10 },
    { key: 'upSpd', name: 'speed',  max: 2, per: 0.08 }
  ];
  M.buyUp = (side, key) => {
    const up = M.UPS.find(u => u.key === key);
    const c = D.custom[side];
    if (!up || c[key] >= up.max || D.smiles < 1) return false;
    c[key]++; D.smiles--; save(); return true;
  };
  M.upMul = (side, key) => {
    const up = M.UPS.find(u => u.key === key);
    return 1 + (D.custom[side][key] || 0) * (up ? up.per : 0);
  };

  /* ================= PARAMS ================= */
  M.params = () => {
    const o = {};
    M.PARAM_DEFS.forEach(p => { o[p.key] = (D.params[p.key] != null) ? D.params[p.key] : p.def; });
    return o;
  };
  M.setParam = (k, v) => { D.params[k] = v; save(); };
  M.resetParams = () => { D.params = {}; save(); };
  M.paramChangedCount = () => Object.keys(D.params).length;
  M.difficulty = () => D.difficulty;
  M.setDifficulty = (d) => { D.difficulty = d; save(); };
  /* effective params = sliders × difficulty factors */
  M.effective = () => {
    const P = M.params();
    const f = (M.DIFFS[D.difficulty] || M.DIFFS.normal).f;
    const E = Object.assign({}, P);
    Object.keys(f).forEach(k => { E[k] = P[k] * f[k]; });
    return E;
  };

  /* ================= BATTLE TRACKER ================= */
  const WIN_SMILES = 5;
  function completeCh(ch, T) {
    if (D.done[ch.id]) return 0;
    D.done[ch.id] = true;
    D.smiles++;
    if (T) { T.newly.push(ch); T.earned++; if (T.onUnlock) T.onUnlock(ch); }
    save();
    return 1;
  }
  M.beginBattle = (info = {}) => {
    D.plays++;
    const T = {
      info,
      stats: { bonks: 0, crits: 0, specials: 0, snacks: 0, gotBonked: 0 },
      newly: [], earned: 0, onUnlock: null, finished: false
    };
    T.ev = (k, n = 1) => {
      T.stats[k] += n;
      if (D.best[k] == null || T.stats[k] > D.best[k]) D.best[k] = T.stats[k];
      M.CHALLENGES.forEach(ch => {
        if (ch.scope === 'battle' && !D.done[ch.id] && ch.stat === k && T.stats[k] >= ch.n) completeCh(ch, T);
      });
      save();
    };
    T.event = (id) => {
      M.CHALLENGES.forEach(ch => { if (ch.scope === 'event' && ch.ev === id && !D.done[ch.id]) completeCh(ch, T); });
    };
    T.finish = (res) => {
      if (T.finished) return { newlyDone: [], earned: 0 };
      T.finished = true;
      if (res.won) {
        D.wins++;
        if (info.side === 'left') D.winsLeft++;
        else if (info.side === 'right') D.winsRight++;
        D.smiles += WIN_SMILES;
        T.earned += WIN_SMILES;
      }
      res.mode = info.mode; res.difficulty = info.difficulty;
      M.CHALLENGES.forEach(ch => {
        if (D.done[ch.id]) return;
        if (ch.scope === 'end' && ch.test && ch.test(res, T.stats, info, D)) completeCh(ch, T);
        if (ch.scope === 'total' && ch.total && ch.total(D)) completeCh(ch, T);
      });
      save();
      return { newlyDone: T.newly, earned: T.earned };
    };
    /* plays-count challenges may complete right away */
    M.CHALLENGES.forEach(ch => { if (ch.scope === 'total' && !D.done[ch.id] && ch.total && ch.total(D)) completeCh(ch, T); });
    save();
    return T;
  };
  M.challengeState = (id) => {
    const ch = M.CHALLENGES.find(c => c.id === id);
    const done = !!D.done[id];
    let prog = null;
    if (ch && ch.scope === 'battle') prog = { cur: Math.min(D.best[ch.stat] || 0, ch.n), max: ch.n, note: 'best in one battle' };
    if (ch && ch.scope === 'total' && ch.id === 'veteran') prog = { cur: Math.min(D.wins, 5), max: 5, note: 'total wins' };
    return { done, prog };
  };
  M.doneCount = () => M.CHALLENGES.filter(c => D.done[c.id]).length;

  /* ================= PROGRESSION CONTROLS ================= */
  M.resetProgress = () => {
    const keepParams = D.params, keepDiff = D.difficulty;
    const cos = {};
    ['left', 'right'].forEach(side => { const c = D.custom[side]; cos[side] = { name: c.name, size: c.size, face: c.face }; });
    D = fresh();
    D.params = keepParams; D.difficulty = keepDiff;
    ['left', 'right'].forEach(side => Object.assign(D.custom[side], cos[side]));
    save();
  };
  M.unlockEverything = () => {
    D.unlockAll = true;
    M.CHALLENGES.forEach(ch => { if (!D.done[ch.id]) { D.done[ch.id] = true; D.smiles++; } });
    if (D.plays < 10) D.plays = 10;
    save();
  };
})();
