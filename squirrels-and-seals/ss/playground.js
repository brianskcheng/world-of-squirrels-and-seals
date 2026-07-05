/* =====================================================================
   CHAPTER ONE — the meadow & the shore (idle playground)
   Squirrels scamper on the left, seals lounge on the right; everyone
   wanders, snacks, naps, chats, and occasionally makes friends at the
   tideline. Click a critter to say hi.
   ===================================================================== */
(function () {
  const rand = SS.rand, pick = SS.pick;
  const W = SS.world;
  const P = {};
  SS.playground = P;

  let timers = [];
  let running = false;
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const rep = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };

  const SQ_CHAT = [
    'have you seen my acorn?', 'winter is coming…', 'race you up the oak!',
    'my cheeks are FULL', 'crunch crunch', 'the seals look shiny today',
    'i buried it somewhere…', 'tail fluff check!', 'chk chk chk!'
  ];
  const SL_CHAT = [
    'arf arf!', 'the water is perfect', 'tried the mackerel?',
    'belly full, heart full', 'sun-warmed rocks!!', 'the squirrels look fluffy today',
    'boop the snoot', 'five more minutes…', 'ooooorf'
  ];
  const MEET_SQ = ['do you eat acorns?', 'your whiskers are so long!', 'can you teach me to swim?', 'hello from the trees!'];
  const MEET_SL = ['do acorns float?', 'your tail is so big!', 'can you teach me to climb?', 'hello from the sea!'];

  function sideRange(c) {
    // squirrels keep to the meadow, seals to the shore — with a shared strip
    return c.species === 'sq' ? [0.03, 0.55] : [0.50, 0.96];
  }

  function spawnCrowd() {
    for (let i = 0; i < 7; i++) {
      const c = W.addCritter({ species: 'sq', size: rand(88, 118) });
      const p = W.randGround(0.03, 0.5);
      c.place(p.x, p.y);
      if (Math.random() < 0.5) c.face('l');
      wirePetting(c);
    }
    for (let i = 0; i < 6; i++) {
      const c = W.addCritter({ species: 'sl', size: rand(100, 132) });
      const p = W.randGround(0.55, 0.95);
      c.place(p.x, p.y);
      if (Math.random() < 0.6) c.face('l');
      wirePetting(c);
    }
    // starter snacks
    for (let i = 0; i < 5; i++) { const p = W.randGround(0.06, 0.42); W.spawnFood('acorn', p.x, p.y); }
    for (let i = 0; i < 4; i++) { const p = W.randGround(0.6, 0.9); W.spawnFood('fish', p.x, p.y); }
  }

  function wirePetting(c) {
    c.el.addEventListener('pointerdown', (e) => {
      if (!running || !c.alive || c._busy) return;
      e.stopPropagation();
      if (window.__sfx) { window.__sfx.unlock(); window.__sfx.heartPop ? window.__sfx.heartPop() : window.__sfx.pop(); }
      const r = c.el.getBoundingClientRect();
      SS.fx.heart(r.left + r.width * rand(0.3, 0.7), r.top + r.height * 0.05);
      c.flashFace('happy', 'open', 1300);
      c.oneShot('jump', 740);
      c.say(pick(c.species === 'sq'
        ? ['eee! hi!!', 'chirp!', 'that tickles!', 'more pets pls', '!!!']
        : ['arf!!', 'ooorf~', 'boop received', 'happy seal noises', '!!!']), 1500);
    });
  }

  /* ---- one brain tick for one critter ---- */
  function think(c) {
    if (!running || !c.alive || c._busy) return;
    const roll = Math.random();
    const [x0, x1] = sideRange(c);

    if (roll < 0.30) {                     // wander
      const p = W.randGround(x0, x1);
      c._busy = true;
      c.moveTo(p.x, p.y, c.species === 'sq' ? rand(95, 150) : rand(55, 85), () => { c._busy = false; });

    } else if (roll < 0.48) {              // snack
      const f = W.nearestFood(c.species === 'sq' ? 'acorn' : 'fish', c.x, c.y);
      if (f && !f.claimed) {
        c._busy = true;
        W.eatFood(c, f, () => { c._busy = false; });
      }

    } else if (roll < 0.58) {              // jump about
      c.jump();
      if (c.species === 'sl' && c.x > W.vw() * 0.72) {
        const r = c.el.getBoundingClientRect();
        later(() => SS.fx.splash(r.left + r.width / 2, r.top + r.height * 0.9, 7), 320);
      }

    } else if (roll < 0.72) {              // chat with a neighbor
      const buddy = W.critters.find(o => o !== c && o.alive && !o._busy && Math.abs(o.x - c.x) < 260 && Math.abs(o.y - c.y) < 120);
      if (buddy) {
        c._busy = buddy._busy = true;
        c.face(buddy.x < c.x ? 'l' : 'r');
        buddy.face(c.x < buddy.x ? 'l' : 'r');
        const cross = buddy.species !== c.species;
        c.say(pick(cross ? (c.species === 'sq' ? MEET_SQ : MEET_SL) : (c.species === 'sq' ? SQ_CHAT : SL_CHAT)), 2100);
        later(() => {
          if (buddy.alive) buddy.say(pick(cross ? (buddy.species === 'sq' ? MEET_SQ : MEET_SL) : (buddy.species === 'sq' ? SQ_CHAT : SL_CHAT)), 2100);
          if (cross) {
            const r1 = c.el.getBoundingClientRect();
            SS.fx.heart(r1.left + r1.width / 2, r1.top - 6);
          }
        }, 1400);
        later(() => { c._busy = buddy._busy = false; }, 3400);
      }

    } else if (roll < 0.80) {              // nap
      c._busy = true;
      c.setAction('sleep');
      const zz = rep(() => {
        const r = c.el.getBoundingClientRect();
        SS.fx.zzz(r.left + r.width * 0.6, r.top + r.height * 0.25);
      }, 1500);
      later(() => {
        clearInterval(zz);
        if (c.alive) { c.setAction('idle'); c.flashFace('closed', 'smile', 700); }
        c._busy = false;
      }, rand(5200, 8600));

    } else if (roll < 0.88) {              // dance / clap
      c._busy = true;
      c.setAction(c.species === 'sl' && Math.random() < 0.6 ? 'clap' : 'dance');
      c.flashFace('happy', 'open', 2000);
      later(() => { if (c.alive) c.setAction('idle'); c._busy = false; }, rand(1800, 2800));

    } else if (roll < 0.94 && c.species === 'sq') { // forage under the oak
      c._busy = true;
      const ox = W.vw() * rand(0.07, 0.16), oy = rand(W.groundTop() + 30, W.groundTop() + 120);
      c.moveTo(ox, oy, 140, () => {
        if (!c.alive) { c._busy = false; return; }
        c.setAction('build'); // digging looks like pawing at the ground
        const dig = rep(() => {
          const r = c.el.getBoundingClientRect();
          SS.fx.dust(r.left + r.width * 0.7, r.top + r.height * 0.95, 2, [6, 12]);
        }, 300);
        later(() => {
          clearInterval(dig);
          if (!c.alive) { c._busy = false; return; }
          c.setAction('idle');
          W.spawnFood('acorn', c.x + rand(-20, 30), c.y + rand(-6, 6));
          c.say('found one!', 1500);
          c.oneShot('jump', 740);
          c._busy = false;
        }, rand(1600, 2600));
      });

    } else if (roll < 0.94 && c.species === 'sl') { // splash in the shallows
      c._busy = true;
      const sx = W.vw() * rand(0.78, 0.94), sy = rand(W.groundTop() + 40, W.groundBot() - 10);
      c.moveTo(sx, sy, 75, () => {
        if (!c.alive) { c._busy = false; return; }
        const r = c.el.getBoundingClientRect();
        SS.fx.ripple(r.left + r.width / 2, r.top + r.height * 0.92);
        SS.fx.splash(r.left + r.width / 2, r.top + r.height * 0.85, 8);
        c.oneShot('jump', 740);
        later(() => {
          if (c.alive && Math.random() < 0.7) {
            W.spawnFood('fish', c.x + rand(-40, 20), c.y + rand(-8, 8));
            c.say('caught one!', 1500);
          }
          c._busy = false;
        }, 900);
      });
    } else {
      // little wave at nobody in particular
      c.setAction('wave');
      later(() => { if (c.alive && !c._busy) c.setAction('idle'); }, 1300);
    }
  }

  /* ---- tideline meetups: one squirrel + one seal walk over and say hi ---- */
  function meetup() {
    if (!running) return;
    const sq = pick(W.critters.filter(c => c.species === 'sq' && c.alive && !c._busy) || []);
    const sl = pick(W.critters.filter(c => c.species === 'sl' && c.alive && !c._busy) || []);
    if (!sq || !sl) return;
    const y = rand(W.groundTop() + 60, W.groundBot() - 30);
    const tx = W.tidelineX();
    sq._busy = sl._busy = true;
    sq.moveTo(tx - 55, y, 130, () => { if (sq.alive) { sq.setAction('wave'); sq.say(pick(MEET_SQ), 2200); } });
    sl.moveTo(tx + 60, y + 6, 75, () => {
      if (sl.alive) {
        sl.setAction('wave');
        later(() => { if (sl.alive) sl.say(pick(MEET_SL), 2200); }, 1500);
      }
    });
    later(() => {
      [sq, sl].forEach(c => { if (c.alive) { c.setAction('idle'); c.oneShot('jump', 740); } });
      const r = sq.el.getBoundingClientRect();
      SS.fx.heart((sq.x + sl.x) / 2, r.top);
      later(() => { sq._busy = sl._busy = false; }, 700);
    }, 5200);
  }

  /* ---- food replenishment: acorns drop from the oak, fish wash ashore ---- */
  function replenish() {
    if (!running) return;
    const acorns = W.foods.filter(f => f.kind === 'acorn').length;
    const fish = W.foods.filter(f => f.kind === 'fish').length;
    if (acorns < 4) {
      const tx = W.vw() * rand(0.05, 0.18), ty = rand(W.groundTop() + 26, W.groundBot() - 40);
      SS.fx.lob('acorn', W.vw() * 0.10, W.vh() * 0.28, tx, ty, {
        arc: 30, dur: 700, spin: true,
        onHit: (x, yy) => { W.spawnFood('acorn', x, yy); SS.fx.dust(x, yy, 2, [5, 10]); if (window.__sfx) window.__sfx.woodKnock(500); }
      });
    }
    if (fish < 3) {
      const fxp = W.vw() * rand(0.72, 0.93), fyp = rand(W.groundTop() + 40, W.groundBot() - 16);
      W.spawnFood('fish', fxp, fyp);
      SS.fx.splash(fxp, fyp, 5);
    }
  }

  P.start = (opts = {}) => {
    running = true;
    spawnCrowd();
    if (!opts.quiet) W.showCard('CHAPTER ONE', 'The Meadow & the Shore', 'a peaceful beginning');
    // brains
    rep(() => {
      W.critters.forEach(c => { if (Math.random() < 0.4) think(c); });
    }, 2400);
    rep(meetup, 16000);
    rep(replenish, 6500);
    later(meetup, 4500);
    // playground music once audio is unlocked by any gesture
    const tryMusic = () => { if (window.__sfx) window.__sfx.startMusic('playground', { volume: 0.3 }); };
    window.addEventListener('pointerdown', tryMusic, { once: true });
  };

  P.stop = () => {
    running = false;
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    timers = [];
    W.critters.forEach(c => { c.stopMove(); c.setAction('idle'); c._busy = false; });
  };

  /* Chapter 4 reuses the same idle brains for the peace epilogue —
     but with both species mingling everywhere and mixed snacks. */
  P.startPeace = () => {
    running = true;
    rep(() => { W.critters.forEach(c => { if (Math.random() < 0.45) thinkPeace(c); }); }, 2600);
    rep(() => {
      if (W.foods.length < 10) {
        const p = W.randGround(0.06, 0.94);
        W.spawnFood(Math.random() < 0.5 ? 'acorn' : 'fish', p.x, p.y);
      }
    }, 4200);
  };
  function thinkPeace(c) {
    if (!running || !c.alive || c._busy) return;
    const roll = Math.random();
    if (roll < 0.3) {
      const p = W.randGround(0.04, 0.94);
      c._busy = true;
      c.moveTo(p.x, p.y, c.species === 'sq' ? rand(95, 150) : rand(55, 85), () => { c._busy = false; });
    } else if (roll < 0.55) {
      const f = W.nearestFood(null, c.x, c.y);   // anyone eats anything now
      if (f && !f.claimed) { c._busy = true; W.eatFood(c, f, () => { c._busy = false; }); }
    } else if (roll < 0.7) {
      c._busy = true;
      c.setAction(pick(['dance', 'clap', 'cheer']));
      c.flashFace('happy', 'open', 2000);
      later(() => { if (c.alive) c.setAction('idle'); c._busy = false; }, rand(1800, 3000));
    } else if (roll < 0.85) {
      think(c); // chat/nap/jump from the normal brain
    } else {
      c.jump();
    }
  }

  P.wirePetting = wirePetting;
})();
